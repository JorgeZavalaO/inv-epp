// src/app/(protected)/stock-movements/page.tsx
import prisma from "@/lib/prisma";
import MovementTable from "@/components/stock/MovementTable";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const revalidate = 0;
const PAGE_SIZE = 50;

export default async function StockMovementsPage({
  searchParams,
}: {
  searchParams?: { page?: string };
}) {
  // 1. Parsear el número de página (1-based)
  const page = Math.max(1, Number(searchParams?.page ?? "1"));

  // 2. Traer PAGE_SIZE + 1 registros para saber si hay NEXT
  const rawList = await prisma.stockMovement.findMany({
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE + 1,
    include: {
      epp: { select: { code: true, name: true } },
      user: { select: { email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // 3. Determinar hasNext y recortar la lista si excede PAGE_SIZE
  const hasNext = rawList.length > PAGE_SIZE;
  const movements = hasNext ? rawList.slice(0, PAGE_SIZE) : rawList;

  // 4. Determinar hasPrev
  const hasPrev = page > 1;

  // 5. Mapear al formato que espera MovementTable
  const data = movements.map((mv) => ({
    id: mv.id,
    date: mv.createdAt.toISOString(),
    eppCode: mv.epp.code,
    eppName: mv.epp.name,
    quantity: mv.quantity,
    type: mv.type,
    operator: mv.user.email, // Asignar el operador (ajusta si tienes otro campo)
  }));

  return (
    <section className="space-y-6 px-4 md:px-8 py-6">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Movimientos de Stock</h1>
        <Link href="/stock-movements/new">
          <Button variant="default" className="text-sm font-semibold">
            + Nuevo Movimiento
          </Button>
        </Link>
      </header>

      <div className="overflow-x-auto bg-white rounded-md shadow-sm">
        <MovementTable data={data} />
      </div>

      {/* Paginación */}
      <nav className="flex justify-between">
        {hasPrev ? (
          <Link href={`/stock-movements?page=${page - 1}`}>
            <Button variant="outline">&larr; Anterior</Button>
          </Link>
        ) : (
          <div />
        )}
        {hasNext && (
          <Link href={`/stock-movements?page=${page + 1}`}>
            <Button variant="outline">Siguiente &rarr;</Button>
          </Link>
        )}
      </nav>
    </section>
  );
}
