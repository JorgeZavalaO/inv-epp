import prisma from "@/lib/prisma";
import WarehousesClient, { WarehouseWithStock } from "@/app/(protected)/warehouses/WarehousesClient";
import { hasAnyPermission, hasPermission } from "@/lib/auth-utils";
import { redirect } from "next/navigation";

export const revalidate = 0;

export default async function WarehousesPage() {
  // Verificar permisos - necesita al menos uno de estos
  const canAccess = await hasAnyPermission(['warehouses_manage', 'warehouses_export']);
  
  if (!canAccess) {
    redirect('/dashboard');
  }
  
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

  const canExport = await hasPermission('warehouses_export');
  return <WarehousesClient list={list} canExport={canExport} />;
}
