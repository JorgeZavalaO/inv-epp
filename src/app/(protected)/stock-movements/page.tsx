
import prisma from "@/lib/prisma";
import MovementTable from "@/components/stock/MovementTable";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const revalidate = 0;
const PAGE_SIZE = 50;

type Props = {
  searchParams: Promise<{ page?: string }>;
};

export default async function StockMovementsPage({ searchParams }: Props) {
  
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam ?? "1"));

  const rawList = await prisma.stockMovement.findMany({
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE + 1,
    include: {
      epp: { select: { code: true, name: true } },
      user: { select: { email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const hasNext = rawList.length > PAGE_SIZE;
  const movements = hasNext ? rawList.slice(0, PAGE_SIZE) : rawList;
  const hasPrev = page > 1;

  const data = movements.map((mv) => ({
    id: mv.id,
    date: mv.createdAt.toISOString(),
    eppCode: mv.epp.code,
    eppName: mv.epp.name,
    quantity: mv.quantity,
    type: mv.type,
    operator: mv.user.email,
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
