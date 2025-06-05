import prisma from "@/lib/prisma";
import EppTable from "@/components/epp/EppTable";
import { Prisma } from "@prisma/client";

export const revalidate = 0;

type Props = {
  searchParams: Promise<{ q?: string; warehouse?: string }>;
};

export default async function EppsPage({ searchParams }: Props) {
  const { q = "", warehouse = "" } = await searchParams;

  // 1) Obtener lista de almacenes para el <select>
  const warehouses = await prisma.warehouse.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  // 2) Configurar filtro de texto
  const contains = (val: string) => ({
    contains: val,
    mode: Prisma.QueryMode.insensitive,
  });
  const whereEpp = q
    ? {
        OR: [
          { name: contains(q) },
          { code: contains(q) },
          { category: contains(q) },
        ],
      }
    : {};

  // 3) Convertir parámetro warehouse a número (si existe)
  const warehouseId = Number(warehouse) || undefined;

  // 4) Consultar EPPs, incluyendo stocks filtrados por warehouseId (cuando corresponda)
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
        select: { quantity: true, warehouseId: true },
        where: warehouseId ? { warehouseId } : undefined,
      },
      _count: { select: { movements: true } },
    },
    orderBy: { name: "asc" },
  });

  // 5) Mapear datos para la tabla
  const data = epps.map((e) => {
    const totalQty = e.stocks.reduce((acc, s) => acc + (s.quantity || 0), 0);
    // Si existe warehouseId, e.stocks sólo contendrá registros de ese almacén
    const assocStock = warehouseId
      ? e.stocks.find((s) => s.warehouseId === warehouseId) ?? null
      : null;

    return {
      id: e.id,
      code: e.code,
      name: e.name,
      category: e.category,
      description: e.description ?? null,
      stock: totalQty,
      minStock: e.minStock,
      hasMovement: e._count.movements > 0,
      warehouseId: assocStock?.warehouseId ?? null,
      initialQty: assocStock ? assocStock.quantity : null,
    };
  });

  return (
    <section className="space-y-6 px-4 md:px-8 py-6">
      <h1 className="text-3xl font-bold tracking-tight">Catálogo de EPPs</h1>

      {/* ─── Formulario de filtros (envía GET) ─────────────── */}
      <form method="get" className="grid md:grid-cols-[1fr_200px] gap-4 mb-6">
        {/* Filtro de texto */}
        <input
          type="text"
          name="q"
          placeholder="Buscar código, nombre o categoría…"
          defaultValue={q}
          className="w-full rounded-md border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />

        {/* Filtro por almacén */}
        <select
          name="warehouse"
          defaultValue={warehouse}
          className="rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Todos los almacenes</option>
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
      </form>

      <EppTable data={data} />
    </section>
  );
}
