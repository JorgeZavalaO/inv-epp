import prisma from "@/lib/prisma";
import ReturnClient, { ReturnBatchRow } from "@/components/return/ReturnClient";

export const revalidate = 0;

export default async function ReturnsPage() {
  const list = await prisma.returnBatch.findMany({
    include: {
      warehouse: { select: { name: true } },     // <- puede venir null
      user:      { select: { name: true, email: true } }, // <- idem
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
  }));

  return <ReturnClient initialData={data} />;
}
