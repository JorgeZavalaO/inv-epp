import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { sqlWarehouseIn, type WarehouseScope } from "@/lib/warehouse-scope";
import { limaMonthKey, parseLimaDateBoundary } from "@/lib/date-range";

export interface MonthlyPoint {
  month: string; // YYYY-MM
  qty: number;
}

export interface TopItem {
  name: string;
  qty: number;
}

export interface LocationItem {
  location: string;
  qty: number;
}

export interface LatestDeliveryRow {
  id: number;
  date: string; // ISO
  eppName: string;
  qty: number;
  batchCode: string;
  collaborator: string | null;
  warehouse: string;
}

export interface ReportsData {
  year: number;
  monthly: MonthlyPoint[];
  topEpps: TopItem[];
  topLocations: LocationItem[];
  latest: LatestDeliveryRow[];
  categories?: Array<{ category: string; qty: number; pct: number }>;
  locationsFull?: LocationItem[]; // sin límite
  indicators?: ReportsIndicators;
  transferSummary?: {
    totalTransfers: number;
    totalUnits: number;
    pending: number;
    approved: number;
    rejected: number;
  };
  latestTransfers?: Array<{
    code: string;
    date: string;
    eppName: string;
    quantity: number;
    fromWarehouse: string;
    toWarehouse: string;
    status: string;
  }>;
}

export interface ReportsFilters {
  warehouseId?: number;
  /** Effective warehouse scope from the session. Overrides warehouseId. */
  warehouseIds?: number[] | null;
  category?: string;
  collaboratorId?: number;
  location?: string;
  from?: string; // ISO date (yyyy-mm-dd)
  to?: string;   // ISO date (yyyy-mm-dd)
}

export interface FilterData {
  warehouses: Array<{ id: number; name: string }>;
  categories: string[];
  collaborators: Array<{ id: number; name: string }>;
  locations: string[];
}

export interface ReportsIndicators {
  totalDeliveredQty: number;
  deliveriesCount: number;
  avgItemsPerDelivery: number;
  requestsCount: number;
  completedRequests: number;
  requestsCompletionRate: number; // 0..1
  returnQty: number;
  returnRate: number; // 0..1 sobre entregado
  uniqueCollaborators: number;
  uniqueEpps: number;
  averageDailyDeliveredQty: number;
}

function ensureMonthsInRange(rows: Array<{ month: string; qty: number }>, from: Date, to: Date): MonthlyPoint[] {
  const byMonth = new Map(rows.map(r => [r.month, r.qty] as const));
  const result: MonthlyPoint[] = [];
  const [startYear, startMonth] = limaMonthKey(from).split("-").map(Number);
  const [endYear, endMonth] = limaMonthKey(to).split("-").map(Number);
  let year = startYear;
  let month = startMonth;
  while (year < endYear || (year === endYear && month <= endMonth)) {
    const key = `${year}-${String(month).padStart(2, "0")}`;
    result.push({ month: key, qty: byMonth.get(key) ?? 0 });
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return result;
}

export async function fetchReportsData(year: number, filters: ReportsFilters = {}): Promise<ReportsData> {
  const { category, collaboratorId, location, from, to } = filters;
  const scopedWarehouseIds =
    filters.warehouseIds !== undefined
      ? filters.warehouseIds
      : filters.warehouseId
        ? [filters.warehouseId]
        : null;
  const safeYear = Number.isFinite(year) ? Math.trunc(year) : new Date().getFullYear();
  const defaultFrom =
    parseLimaDateBoundary(`${safeYear}-01-01`, "start") ?? new Date(safeYear, 0, 1);
  const defaultTo =
    parseLimaDateBoundary(`${safeYear}-12-31`, "end") ?? new Date(safeYear, 11, 31, 23, 59, 59, 999);
  // Date params are `yyyy-mm-dd` and must be read as full days in America/Lima.
  let fromParam = from;
  let toParam = to;
  if (fromParam && toParam && fromParam > toParam) {
    [fromParam, toParam] = [toParam, fromParam];
  }
  const fromDate = parseLimaDateBoundary(fromParam, "start") ?? defaultFrom;
  const toDate = parseLimaDateBoundary(toParam, "end") ?? defaultTo;
  
  // ✅ Construir condiciones WHERE base (siempre disponibles)
  const baseConditions = [Prisma.sql`d."createdAt" BETWEEN ${fromDate} AND ${toDate}`];
  baseConditions.push(sqlWarehouseIn(Prisma.raw('b."warehouseId"'), scopedWarehouseIds));
  if (category) baseConditions.push(Prisma.sql`e."category" = ${category}`);
  if (collaboratorId) baseConditions.push(Prisma.sql`b."collaboratorId" = ${collaboratorId}`);
  
  const baseWhere = Prisma.sql`WHERE ${Prisma.join(baseConditions, ' AND ')}`;
  
  // ✅ WHERE clause con filtro de localidad (requiere JOIN con Collaborator)
  const whereWithLocation = (() => {
    const conds = [...baseConditions];
    if (location) conds.push(Prisma.sql`c."location" = ${location}`);
    return Prisma.sql`WHERE ${Prisma.join(conds, ' AND ')}`;
  })();
  
  // ✅ OPTIMIZACIÓN: Queries paralelas optimizadas con límites
  const [monthlyRaw, topEpps, topLocations, latest, categoriesRaw, locationsFull, indicatorsDeliveryBase, returnAgg, requestsAgg, transferSummaryRaw, latestTransfersRaw] = await Promise.all([
    prisma.$queryRaw<Array<{ month: string; qty: number }>>(Prisma.sql`
      SELECT TO_CHAR(date_trunc('month', d."createdAt" - INTERVAL '5 hours'), 'YYYY-MM') AS month,
             SUM(d.quantity)::int AS qty
      FROM "Delivery" d
      INNER JOIN "DeliveryBatch" b ON b.id = d."batchId"
      INNER JOIN "EPP" e ON e.id = d."eppId"
      ${location ? Prisma.sql`LEFT JOIN "Collaborator" c ON c.id = b."collaboratorId"` : Prisma.empty}
      ${location ? whereWithLocation : baseWhere}
      GROUP BY month
      ORDER BY month
    `),
    prisma.$queryRaw<TopItem[]>(Prisma.sql`
      SELECT e.name, SUM(d.quantity)::int AS qty
      FROM "Delivery" d
      INNER JOIN "EPP" e ON e.id = d."eppId"
      INNER JOIN "DeliveryBatch" b ON b.id = d."batchId"
      ${location ? Prisma.sql`LEFT JOIN "Collaborator" c ON c.id = b."collaboratorId"` : Prisma.empty}
      ${location ? whereWithLocation : baseWhere}
      GROUP BY e.id, e.name
      ORDER BY SUM(d.quantity) DESC
      LIMIT 5
    `),
    prisma.$queryRaw<LocationItem[]>(Prisma.sql`
      SELECT COALESCE(c.location, 'Sin ubicación') AS location,
             SUM(d.quantity)::int AS qty
      FROM "Delivery" d
      INNER JOIN "DeliveryBatch" b ON b.id = d."batchId"
      LEFT JOIN "Collaborator" c ON c.id = b."collaboratorId"
      INNER JOIN "EPP" e ON e.id = d."eppId"
      ${whereWithLocation}
      GROUP BY location
      ORDER BY qty DESC
      LIMIT 5
    `),
    prisma.$queryRaw<LatestDeliveryRow[]>(Prisma.sql`
      SELECT d.id,
             d."createdAt"::text AS date,
             e.name AS "eppName",
             d.quantity::int AS qty,
             b.code AS "batchCode",
             c.name AS collaborator,
             w.name AS warehouse
      FROM "Delivery" d
      INNER JOIN "EPP" e ON e.id = d."eppId"
      INNER JOIN "DeliveryBatch" b ON b.id = d."batchId"
      LEFT JOIN "Collaborator" c ON c.id = b."collaboratorId"
      INNER JOIN "Warehouse" w ON w.id = b."warehouseId"
      ${whereWithLocation}
      ORDER BY d."createdAt" DESC
      LIMIT 12
    `),
    // Distribución por categoría completa
    prisma.$queryRaw<Array<{ category: string; qty: number }>>(Prisma.sql`
      SELECT e.category, SUM(d.quantity)::int AS qty
      FROM "Delivery" d
      INNER JOIN "DeliveryBatch" b ON b.id = d."batchId"
      INNER JOIN "EPP" e ON e.id = d."eppId"
      ${location ? Prisma.sql`LEFT JOIN "Collaborator" c ON c.id = b."collaboratorId"` : Prisma.empty}
      ${location ? whereWithLocation : baseWhere}
      GROUP BY e.category
      ORDER BY qty DESC
    `),
    // Todas las ubicaciones (sin límite)
    prisma.$queryRaw<LocationItem[]>(Prisma.sql`
      SELECT COALESCE(c.location, 'Sin ubicación') AS location,
             SUM(d.quantity)::int AS qty
      FROM "Delivery" d
      INNER JOIN "DeliveryBatch" b ON b.id = d."batchId"
      LEFT JOIN "Collaborator" c ON c.id = b."collaboratorId"
      INNER JOIN "EPP" e ON e.id = d."eppId"
      ${whereWithLocation}
      GROUP BY location
      ORDER BY qty DESC
    `),
    // Indicadores base de entregas
    prisma.$queryRaw<Array<{ delivered_qty: number; deliveries_count: number; unique_epps: number; unique_collaborators: number }>>(Prisma.sql`
      SELECT COALESCE(SUM(d.quantity),0)::int AS delivered_qty,
             COUNT(d.*)::int AS deliveries_count,
             COUNT(DISTINCT d."eppId")::int AS unique_epps,
             COUNT(DISTINCT b."collaboratorId")::int AS unique_collaborators
      FROM "Delivery" d
      INNER JOIN "DeliveryBatch" b ON b.id = d."batchId"
      INNER JOIN "EPP" e ON e.id = d."eppId"
      ${location ? Prisma.sql`LEFT JOIN "Collaborator" c ON c.id = b."collaboratorId"` : Prisma.empty}
      ${location ? whereWithLocation : baseWhere}
    `),
    // Cantidad devuelta
    prisma.$queryRaw<Array<{ return_qty: number }>>(Prisma.sql`
      SELECT COALESCE(SUM(r.quantity),0)::int AS return_qty
      FROM "ReturnItem" r
      INNER JOIN "ReturnBatch" rb ON rb.id = r."batchId"
      INNER JOIN "EPP" e ON e.id = r."eppId"
      WHERE rb."createdAt" BETWEEN ${fromDate} AND ${toDate}
        AND e."category" IS NOT NULL
        AND ${sqlWarehouseIn(Prisma.raw('rb."warehouseId"'), scopedWarehouseIds)}
        ${category ? Prisma.sql`AND e."category" = ${category}` : Prisma.empty}
    `),
    // Solicitudes
    prisma.$queryRaw<Array<{ total_requests: number; completed_requests: number }>>(Prisma.sql`
      SELECT COUNT(*)::int AS total_requests,
             SUM(CASE WHEN req.status = 'COMPLETED' THEN 1 ELSE 0 END)::int AS completed_requests
      FROM "Request" req
      INNER JOIN "EPP" e ON e.id = req."eppId"
      WHERE req."createdAt" BETWEEN ${fromDate} AND ${toDate}
        AND ${sqlWarehouseIn(Prisma.raw('req."warehouseId"'), scopedWarehouseIds)}
        ${category ? Prisma.sql`AND e."category" = ${category}` : Prisma.empty}
    `),
    prisma.$queryRaw<Array<{ total_transfers: number; total_units: number; pending: number; approved: number; rejected: number }>>(Prisma.sql`
      SELECT COUNT(*)::int AS total_transfers,
             COALESCE(SUM(sm.quantity), 0)::int AS total_units,
             SUM(CASE WHEN sm.status = 'PENDING' THEN 1 ELSE 0 END)::int AS pending,
             SUM(CASE WHEN sm.status = 'APPROVED' THEN 1 ELSE 0 END)::int AS approved,
             SUM(CASE WHEN sm.status = 'REJECTED' THEN 1 ELSE 0 END)::int AS rejected
      FROM "StockMovement" sm
      INNER JOIN "EPP" e ON e.id = sm."eppId"
      WHERE sm.type = 'TRANSFER_OUT'
        AND sm."createdAt" BETWEEN ${fromDate} AND ${toDate}
        AND sm."purchaseOrder" IS NOT NULL
        AND ${sqlWarehouseIn(Prisma.raw('sm."warehouseId"'), scopedWarehouseIds)}
        ${category ? Prisma.sql`AND e."category" = ${category}` : Prisma.empty}
    `),
    prisma.$queryRaw<Array<{ code: string; date: string; "eppName": string; quantity: number; "fromWarehouse": string; "toWarehouse": string; status: string }>>(Prisma.sql`
      SELECT sm."purchaseOrder" AS code,
             MIN(sm."createdAt")::text AS date,
             e.name AS "eppName",
             MAX(sm.quantity)::int AS quantity,
             COALESCE(MAX(CASE WHEN sm.type = 'TRANSFER_OUT' THEN w.name END), 'N/A') AS "fromWarehouse",
             COALESCE(MAX(CASE WHEN sm.type = 'TRANSFER_IN' THEN w.name END), 'N/A') AS "toWarehouse",
             MAX(sm.status)::text AS status
      FROM "StockMovement" sm
      INNER JOIN "EPP" e ON e.id = sm."eppId"
      INNER JOIN "Warehouse" w ON w.id = sm."warehouseId"
      WHERE sm.type IN ('TRANSFER_OUT', 'TRANSFER_IN')
        AND sm."createdAt" BETWEEN ${fromDate} AND ${toDate}
        AND sm."purchaseOrder" IS NOT NULL
        AND ${sqlWarehouseIn(Prisma.raw('sm."warehouseId"'), scopedWarehouseIds)}
        ${category ? Prisma.sql`AND e."category" = ${category}` : Prisma.empty}
      GROUP BY sm."purchaseOrder", e.name
      ORDER BY MIN(sm."createdAt") DESC
      LIMIT 10
    `),
  ]);

  const deliveredQty = indicatorsDeliveryBase[0]?.delivered_qty ?? 0;
  const deliveriesCount = indicatorsDeliveryBase[0]?.deliveries_count ?? 0;
  const uniqueEpps = indicatorsDeliveryBase[0]?.unique_epps ?? 0;
  const uniqueCollaborators = indicatorsDeliveryBase[0]?.unique_collaborators ?? 0;
  const returnQty = returnAgg[0]?.return_qty ?? 0;
  const requestsCount = requestsAgg[0]?.total_requests ?? 0;
  const completedRequests = requestsAgg[0]?.completed_requests ?? 0;
  const days = Math.max(1, Math.round((toDate.getTime() - fromDate.getTime()) / 86400000) + 1);
  const indicators: ReportsIndicators = {
    totalDeliveredQty: deliveredQty,
    deliveriesCount,
    avgItemsPerDelivery: deliveriesCount ? deliveredQty / deliveriesCount : 0,
    requestsCount,
    completedRequests,
    requestsCompletionRate: requestsCount ? completedRequests / requestsCount : 0,
    returnQty,
    returnRate: deliveredQty ? returnQty / deliveredQty : 0,
    uniqueCollaborators,
    uniqueEpps,
    averageDailyDeliveredQty: deliveredQty / days,
  };

  const categoriesTotal = categoriesRaw.reduce((a, c) => a + c.qty, 0) || 1;
  const transferSummary = transferSummaryRaw[0] ?? {
    total_transfers: 0,
    total_units: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  };

  return {
    year,
    monthly: ensureMonthsInRange(monthlyRaw, fromDate, toDate),
    topEpps,
    topLocations,
    latest,
    categories: categoriesRaw.map(row => ({ category: row.category, qty: row.qty, pct: row.qty / categoriesTotal })),
    locationsFull,
    indicators,
    transferSummary: {
      totalTransfers: transferSummary.total_transfers,
      totalUnits: transferSummary.total_units,
      pending: transferSummary.pending,
      approved: transferSummary.approved,
      rejected: transferSummary.rejected,
    },
    latestTransfers: latestTransfersRaw,
  };
}

export async function fetchReportFilterData(scope: WarehouseScope): Promise<FilterData> {
  const [warehouses, categoriesRows, collaborators, locationsRows] = await Promise.all([
    prisma.warehouse.findMany({
      where: scope.effectiveIds === null ? {} : { id: { in: scope.effectiveIds } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.$queryRaw<Array<{ category: string | null }>>`
      SELECT DISTINCT "category" FROM "EPP" WHERE "category" IS NOT NULL ORDER BY "category" ASC
    `,
    prisma.collaborator.findMany({ 
      select: { id: true, name: true }, 
      orderBy: { name: "asc" }
    }),
    prisma.$queryRaw<Array<{ location: string }>>`
      SELECT DISTINCT "location" FROM "Collaborator" WHERE "location" IS NOT NULL ORDER BY "location" ASC
    `,
  ]);

  return {
    warehouses,
    categories: categoriesRows.map(r => r.category!).filter(Boolean),
    collaborators,
    locations: locationsRows.map(r => r.location).filter(Boolean),
  };
}
