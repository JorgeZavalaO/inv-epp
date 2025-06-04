import prisma from "@/lib/prisma";
import { subDays, startOfDay } from "date-fns";

export async function fetchDashboardData() {
  const today      = startOfDay(new Date());
  const weekStart  = subDays(today, 7);
  const monthStart = subDays(today, 30);

  // 1) Total de EPPs
  const totalEpps = await prisma.ePP.count();

  // 2) Total de stock: sumamos `quantity` en la tabla EPPStock
  const stockAggregate = await prisma.ePPStock.aggregate({
    _sum: { quantity: true },
  });
  const totalStock = stockAggregate._sum.quantity ?? 0;

  // 3) Entregas de los últimos 7 días
  const deliveries7 = await prisma.delivery.count({
    where: { createdAt: { gte: weekStart } },
  });

  // 4) Devoluciones de los últimos 7 días
  const returns7 = await prisma.return.count({
    where: { createdAt: { gte: weekStart } },
  });

  // 5) Movimientos del mes: agrupamos por tipo y sumamos `quantity`
  const movementsMonth = await prisma.stockMovement.groupBy({
    by: ["type"],
    where: { createdAt: { gte: monthStart } },
    _sum: { quantity: true },
  });

  // Filtramos aquellos eppId cuya suma de `quantity` sea menor a su minStock
  
  // Mejor usar un raw query para rendimiento y simplicidad:
  const lowStock = await prisma.$queryRaw<
    Array<{
      id: number;
      code: string;
      name: string;
      totalStock: number;
      minStock: number;
    }>
  >`
    SELECT e."id", e."code", e."name",
           COALESCE(SUM(s."quantity"), 0) AS "totalStock",
           e."minStock"
    FROM "EPP" e
    LEFT JOIN "EPPStock" s ON s."eppId" = e."id"
    GROUP BY e."id", e."code", e."name", e."minStock"
    HAVING COALESCE(SUM(s."quantity"), 0) < e."minStock"
    ORDER BY COALESCE(SUM(s."quantity"), 0) ASC
    LIMIT 15;`;

  return {
    kpi: {
      totalEpps,
      totalStock,
      deliveries7,
      returns7,
    },
    movementsMonth,
    lowStock,
  };
}
