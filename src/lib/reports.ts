import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

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
}

export interface ReportsFilters {
  warehouseId?: number;
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

function monthKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function ensureMonthsInRange(rows: Array<{ month: string; qty: number }>, from: Date, to: Date): MonthlyPoint[] {
  const byMonth = new Map(rows.map(r => [r.month, r.qty] as const));
  const result: MonthlyPoint[] = [];
  const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
  const end = new Date(to.getFullYear(), to.getMonth(), 1);
  while (cursor <= end) {
    const key = monthKey(cursor);
    result.push({ month: key, qty: byMonth.get(key) ?? 0 });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return result;
}

export async function fetchReportsData(year: number, filters: ReportsFilters = {}): Promise<ReportsData> {
  const { warehouseId, category, collaboratorId, location, from, to } = filters;
  const defaultFrom = new Date(year, 0, 1);
  const defaultTo = new Date(year, 11, 31, 23, 59, 59, 999);
  const fromDate = from ? new Date(from) : defaultFrom;
  const toDate = to ? new Date(to) : defaultTo;
  
  // ✅ Construir condiciones WHERE base (siempre disponibles)
  const baseConditions = [Prisma.sql`d."createdAt" BETWEEN ${fromDate} AND ${toDate}`];
  if (warehouseId) baseConditions.push(Prisma.sql`b."warehouseId" = ${warehouseId}`);
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
  const [monthlyRaw, topEpps, topLocations, latest, categoriesRaw, locationsFull, indicatorsDeliveryBase, returnAgg, requestsAgg] = await Promise.all([
    prisma.$queryRaw<Array<{ month: string; qty: number }>>(Prisma.sql`
      SELECT TO_CHAR(date_trunc('month', d."createdAt"), 'YYYY-MM') AS month,
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
        ${category ? Prisma.sql`AND e."category" = ${category}` : Prisma.empty}
        ${warehouseId ? Prisma.sql`AND rb."warehouseId" = ${warehouseId}` : Prisma.empty}
    `),
    // Solicitudes
    prisma.$queryRaw<Array<{ total_requests: number; completed_requests: number }>>(Prisma.sql`
      SELECT COUNT(*)::int AS total_requests,
             SUM(CASE WHEN req.status = 'COMPLETED' THEN 1 ELSE 0 END)::int AS completed_requests
      FROM "Request" req
      INNER JOIN "EPP" e ON e.id = req."eppId"
      WHERE req."createdAt" BETWEEN ${fromDate} AND ${toDate}
        ${category ? Prisma.sql`AND e."category" = ${category}` : Prisma.empty}
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

  return {
    year,
    monthly: ensureMonthsInRange(monthlyRaw, fromDate, toDate),
    topEpps,
    topLocations,
    latest,
    categories: categoriesRaw.map(row => ({ category: row.category, qty: row.qty, pct: row.qty / categoriesTotal })),
    locationsFull,
    indicators,
  };
}

export async function fetchReportFilterData(): Promise<FilterData> {
  const [warehouses, categoriesRows, collaborators, locationsRows] = await Promise.all([
    prisma.warehouse.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
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
