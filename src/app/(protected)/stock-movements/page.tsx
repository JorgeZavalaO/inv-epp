import prisma from "@/lib/prisma";
import MovementTable from "@/components/stock/MovementTable";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const revalidate = 0;

export default async function StockMovementsPage() {
  const list = await prisma.stockMovement.findMany({
    include: {
      epp: { select: { code: true, name: true } },
      user: { select: { email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <section className="space-y-6 px-4 md:px-8 py-6">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">
          Movimientos de Stock
        </h1>
        <Link href="/stock-movements/new">
          <Button variant="default" className="text-sm font-semibold">
            + Nuevo Movimiento
          </Button>
        </Link>
      </header>

      <div className="overflow-x-auto bg-white rounded-md shadow-sm">
        <MovementTable
        data={list.map((mv) => ({
            id: mv.id,
            date: mv.createdAt.toISOString().split("T")[0],
            eppCode: mv.epp.code,
            eppName: mv.epp.name,
            quantity: mv.quantity,
            type: mv.type,
            user: mv.user.email,
        }))} />
      </div>
    </section>
  );
}