import { Suspense } from "react";
import prisma from "@/lib/prisma";
import WarehousesClient, { WarehouseWithStock } from "@/app/(protected)/warehouses/WarehousesClient";
import { hasAnyPermission, hasPermission } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import { createPaginationMeta, getPaginationSkip, parsePagination } from "@/lib/pagination";

export const revalidate = 0;

export default async function WarehousesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; limit?: string }>;
}) {
  // Verificar permisos - necesita al menos uno de estos
  const canAccess = await hasAnyPermission(['warehouses_manage', 'warehouses_export']);
  
  if (!canAccess) {
    redirect('/dashboard');
  }
  
  const params = await searchParams;
  const requestedPagination = parsePagination(params.page, params.limit);
  const totalCount = await prisma.warehouse.count();
  const pagination = createPaginationMeta(
    requestedPagination.page,
    requestedPagination.limit,
    totalCount,
  );

  // Fetch only the current page while keeping stock totals per warehouse.
  const raw = await prisma.warehouse.findMany({
    select: {
      id:       true,
      name:     true,
      location: true,
      stocks:   { select: { quantity: true } },
    },
    orderBy: [{ name: "asc" }, { id: "asc" }],
    skip: getPaginationSkip(pagination),
    take: pagination.limit,
  });

  // 2) Calcular suma de quantity por almacén
  const list: WarehouseWithStock[] = raw.map((w) => ({
    id:         w.id,
    name:       w.name,
    location:   w.location,
    totalStock: w.stocks.reduce((sum, s) => sum + s.quantity, 0),
  }));

  const canExport = await hasPermission('warehouses_export');
  return (
    <Suspense fallback={<div className="min-h-32" />}>
      <WarehousesClient list={list} pagination={pagination} canExport={canExport} />
    </Suspense>
  );
}
