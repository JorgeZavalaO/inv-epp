import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { subDays, startOfDay } from "date-fns";

export async function GET() {
  const today      = startOfDay(new Date());
  const weekStart  = subDays(today, 7);
  const monthStart = subDays(today, 30);

  const [totalEpps, sumStocks, deliveries7, returns7, movementsMonth, lowStock] =
    await Promise.all([
      prisma.ePP.count(),
      prisma.ePPStock.aggregate({ _sum: { quantity: true } }),
      prisma.deliveryBatch.count({ where: { createdAt: { gte: weekStart } } }),
      prisma.return.count({ where: { createdAt: { gte: weekStart } } }),
      prisma.stockMovement.groupBy({
        by: ["type"],
        where: { createdAt: { gte: monthStart } },
        _sum: { quantity: true },
      }),
      prisma.$queryRaw`
        SELECT e."id", e."code", e."name",
               COALESCE(SUM(s."quantity"), 0) AS "totalStock",
               e."minStock"
        FROM "EPP" e
        LEFT JOIN "EPPStock" s ON s."eppId" = e."id"
        GROUP BY e."id", e."code", e."name", e."minStock"
        HAVING COALESCE(SUM(s."quantity"), 0) < e."minStock"
        ORDER BY COALESCE(SUM(s."quantity"),0) ASC
        LIMIT 15
      `,
    ]);

  return NextResponse.json({
    kpi: {
      totalEpps,
      totalStock: sumStocks._sum.quantity ?? 0,
      deliveries7,
      returns7,
    },
    movementsMonth,
    lowStock,
  });
}