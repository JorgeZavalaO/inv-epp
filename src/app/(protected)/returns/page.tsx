import prisma from "@/lib/prisma";
import ReturnClient, { ReturnBatchRow } from "@/components/return/ReturnClient";
import { hasPermission } from "@/lib/auth-utils";
import { redirect } from "next/navigation";

export const revalidate = 0;

export default async function ReturnsPage() {
  // Verificar permisos
  const canAccess = await hasPermission('returns_manage');
  
  if (!canAccess) {
    redirect('/dashboard');
  }
  
  const list = await prisma.returnBatch.findMany({
    include: {
      warehouse: { select: { name: true } },
      user:      { select: { name: true, email: true } },
      cancelledDeliveryBatch: { select: { code: true } },
      _count:    { select: { items: true } },
    },
    orderBy: { createdAt: "desc" },
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

  return <ReturnClient initialData={data} />;
}
