import prisma from "@/lib/prisma";
import StockMovementsClient from "./StockMovementsClient";

export const revalidate = 0;
const PAGE_SIZE = 50;

export default async function StockMovementsPage({
  searchParams,
}: {
  /* Next genera PageProps cuyo searchParams es Promise<Record<string,string>> */
  searchParams: Promise<{ page?: string }>;
}) {
  // Ahora await searchParams para obtener el objeto real
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam ?? "1"));

  // 1) Movimientos + paginación
  const rawList = await prisma.stockMovement.findMany({
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE + 1,
    include: {
      epp:       { select: { code: true, name: true } },
      user:      { select: { email: true } },
      warehouse: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const hasNext   = rawList.length > PAGE_SIZE;
  const movements = hasNext ? rawList.slice(0, PAGE_SIZE) : rawList;
  const hasPrev   = page > 1;

  // 2) Mapear datos para el cliente
  type AllowedType = "ENTRY" | "EXIT" | "ADJUSTMENT";
  const data = movements.map((mv) => ({
    id:          mv.id,
    eppId:       mv.eppId,
    date:        mv.createdAt.toISOString(),
    eppCode:     mv.epp.code,
    eppName:     mv.epp.name,
    warehouseId: mv.warehouseId,
    warehouse:   mv.warehouse.name,
    quantity:    mv.quantity,
    type:        mv.type as AllowedType,
    operator:    mv.user.email,
    note:        mv.note ?? null,
  }));

  return (
    <section className="space-y-6 px-4 md:px-8 py-6">
      <StockMovementsClient
        data={data}
        page={page}
        hasPrev={hasPrev}
        hasNext={hasNext}
      />
    </section>
  );
}
