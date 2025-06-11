import prisma from "@/lib/prisma";
import WarehousesClient, { WarehouseWithStock } from "@/app/(protected)/warehouses/WarehousesClient";

export const revalidate = 0;

export default async function WarehousesPage() {
  // 1) Traer cada almacén con sus stocks (solo la cantidad)
  const raw = await prisma.warehouse.findMany({
    select: {
      id:       true,
      name:     true,
      location: true,
      stocks:   { select: { quantity: true } },
    },
    orderBy: { name: "asc" },
  });

  // 2) Calcular suma de quantity por almacén
  const list: WarehouseWithStock[] = raw.map((w) => ({
    id:         w.id,
    name:       w.name,
    location:   w.location,
    totalStock: w.stocks.reduce((sum, s) => sum + s.quantity, 0),
  }));

  return <WarehousesClient list={list} />;
}
