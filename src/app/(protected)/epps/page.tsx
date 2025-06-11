import prisma from "@/lib/prisma";
import EppTable, { EppRow } from "@/components/epp/EppTable";
import { Prisma } from "@prisma/client";

export const revalidate = 0;

type Props = {
  searchParams: Promise<{ q?: string; warehouse?: string }>;
};

export default async function EppsPage({ searchParams }: Props) {
  const { q = "" } = await searchParams;

  // 1) lista de almacenes y mapa
  const warehousesList = await prisma.warehouse.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  const warehouseMap: Record<number, string> = {};
  for (const w of warehousesList) warehouseMap[w.id] = w.name;

  // 2) filtro de texto
  const contains = (val: string) => ({ contains: val, mode: Prisma.QueryMode.insensitive });
  const whereEpp = q
    ? { OR: [{ name: contains(q) }, { code: contains(q) }, { category: contains(q) }] }
    : {};

  // 3) filtro de warehouse (solo para el botón "Ver", no para stocks)

  // 4) obtener EPPs con todos los stocks
  const epps = await prisma.ePP.findMany({
    where: whereEpp,
    select: {
      id: true,
      code: true,
      name: true,
      category: true,
      description: true,
      minStock: true,
      stocks: {
        select: { warehouseId: true, quantity: true },
      },
      _count: { select: { movements: true } },
    },
    orderBy: { name: "asc" },
  });

  // 5) mapear filas de la tabla
  const data: EppRow[] = epps.map((e) => {
    const totalQty = e.stocks.reduce((sum, s) => sum + s.quantity, 0);

    return {
      id:           e.id,
      code:         e.code,
      name:         e.name,
      category:     e.category,
      stock:        totalQty,
      // estos campos van para el modal de detalles
      description:  e.description,
      minStock:     e.minStock,
      hasMovement:  e._count.movements > 0,
      items:        e.stocks.map((s) => ({
        warehouseId:   s.warehouseId,
        warehouseName: warehouseMap[s.warehouseId],
        quantity:      s.quantity,
      })),
    };
  });

  return (
    <section className="py-6 px-4 md:px-8 space-y-6">
      <h1 className="text-3xl font-bold">Catálogo de EPPs</h1>
      <EppTable data={data} />
    </section>
  );
}
