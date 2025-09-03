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
}

export interface ReportsFilters {
  warehouseId?: number;
  category?: string;
  from?: string; // ISO date (yyyy-mm-dd)
  to?: string;   // ISO date (yyyy-mm-dd)
}

export interface FilterData {
  warehouses: Array<{ id: number; name: string }>;
  categories: string[];
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
  const { warehouseId, category, from, to } = filters;
  const defaultFrom = new Date(year, 0, 1);
  const defaultTo = new Date(year, 11, 31, 23, 59, 59, 999);
  const fromDate = from ? new Date(from) : defaultFrom;
  const toDate = to ? new Date(to) : defaultTo;
  const where = (() => {
    const conds = [Prisma.sql`d."createdAt" BETWEEN ${fromDate} AND ${toDate}`];
    if (warehouseId) conds.push(Prisma.sql`b."warehouseId" = ${warehouseId}`);
    if (category) conds.push(Prisma.sql`e."category" = ${category}`);
  return Prisma.sql`WHERE ${Prisma.join(conds, ' AND ')}`;
  })();
  // Ejecutamos agregaciones en paralelo para mejor rendimiento
  const [monthlyRaw, topEpps, topLocations, latest] = await Promise.all([
    prisma.$queryRaw<Array<{ month: string; qty: number }>>(Prisma.sql`
      SELECT TO_CHAR(date_trunc('month', d."createdAt"), 'YYYY-MM') AS month,
             SUM(d.quantity)::int AS qty
      FROM "Delivery" d
      INNER JOIN "DeliveryBatch" b ON b.id = d."batchId"
      INNER JOIN "EPP" e ON e.id = d."eppId"
      ${where}
      GROUP BY month
      ORDER BY month
    `),
    prisma.$queryRaw<TopItem[]>(Prisma.sql`
      SELECT e.name, SUM(d.quantity)::int AS qty
      FROM "Delivery" d
      INNER JOIN "EPP" e ON e.id = d."eppId"
      INNER JOIN "DeliveryBatch" b ON b.id = d."batchId"
      ${where}
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
      ${where}
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
      ${where}
      ORDER BY d."createdAt" DESC
      LIMIT 12
    `),
  ]);

  return {
    year,
  monthly: ensureMonthsInRange(monthlyRaw, fromDate, toDate),
    topEpps,
    topLocations,
    latest,
  };
}

export async function fetchReportFilterData(): Promise<FilterData> {
  const [warehouses, categoriesRows] = await Promise.all([
    prisma.warehouse.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.$queryRaw<Array<{ category: string | null }>>`
      SELECT DISTINCT "category" FROM "EPP" WHERE "category" IS NOT NULL ORDER BY "category" ASC
    `,
  ]);

  return {
    warehouses,
    categories: categoriesRows.map(r => r.category!).filter(Boolean),
  };
}
