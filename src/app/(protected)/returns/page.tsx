import { Suspense } from "react";
import prisma from "@/lib/prisma";
import ReturnClient, { ReturnBatchRow } from "@/components/return/ReturnClient";
import { hasPermission } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import { createPaginationMeta, getPaginationSkip, parsePagination } from "@/lib/pagination";

export const revalidate = 0;

export default async function ReturnsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; limit?: string }>;
}) {
  // Verificar permisos
  const canAccess = await hasPermission('returns_manage');
  
  if (!canAccess) {
    redirect('/dashboard');
  }
  
  const params = await searchParams;
  const requestedPagination = parsePagination(params.page, params.limit);
  const totalCount = await prisma.returnBatch.count();
  const pagination = createPaginationMeta(
    requestedPagination.page,
    requestedPagination.limit,
    totalCount,
  );
  const list = await prisma.returnBatch.findMany({
    include: {
      warehouse: { select: { name: true } },
      user:      { select: { name: true, email: true } },
      cancelledDeliveryBatch: { select: { code: true } },
      _count:    { select: { items: true } },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: getPaginationSkip(pagination),
    take: pagination.limit,
  });

  /* ⛑️  conversione segura → ninguna propiedad es usada sin comprobar */
  const data: ReturnBatchRow[] = list.map((b) => ({
    id:        b.id,
    code:      b.code,
    date:      b.createdAt.toISOString(),
    warehouse: b.warehouse?.name ?? "—",
    user:      b.user?.name ?? b.user?.email ?? "—",
    count:     b._count.items,
    cancelledDeliveryBatchCode: b.cancelledDeliveryBatch?.code ?? null,
  }));

  return (
    <Suspense fallback={<div className="min-h-32" />}>
      <ReturnClient initialData={data} pagination={pagination} />
    </Suspense>
  );
}
