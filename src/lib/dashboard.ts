// src/lib/dashboard.ts
import prisma from "@/lib/prisma";
import { subDays, startOfDay } from "date-fns";

export async function fetchDashboardData() {
  const today      = startOfDay(new Date());
  const weekStart  = subDays(today, 7);
  const monthStart = subDays(today, 30);

  const [
    totalEpps,
    totalStock,
    deliveries7,
    returns7,
    movementsMonth,
    lowStock,
  ] = await Promise.all([
    prisma.ePP.count(),
    prisma.ePP.aggregate({ _sum: { stock: true } }),
    prisma.delivery.count({ where: { createdAt: { gte: weekStart } } }),
    prisma.return.count(   { where: { createdAt: { gte: weekStart } } }),
    prisma.stockMovement.groupBy({
      by: ["type"],
      where: { createdAt: { gte: monthStart } },
      _sum: { quantity: true },
    }),
    prisma.ePP.findMany({
      where: { stock: { lt: prisma.ePP.fields.minStock } },
      orderBy: { stock: "asc" },
      take: 15,
      select: { id: true, code: true, name: true, stock: true, minStock: true },
    }),
  ]);

  return {
    kpi: {
      totalEpps,
      totalStock: totalStock._sum.stock ?? 0,
      deliveries7,
      returns7,
    },
    movementsMonth,
    lowStock,
  };
}
