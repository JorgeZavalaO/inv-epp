// 📁 src/app/(protected)/warehouses/page.tsx
import prisma from "@/lib/prisma";
import WarehousesClient from "@/app/(protected)/warehouses/WarehousesClient";

export const revalidate = 0;

export default async function WarehousesPage() {
  const list = await prisma.warehouse.findMany({
    include: { _count: { select: { stocks: true } } },
    orderBy: { name: "asc" },
  });

  return <WarehousesClient list={list} />;
}
