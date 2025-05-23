import prisma from "@/lib/prisma";
import ReturnTable from "@/components/return/ReturnTable";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const revalidate = 0;

export default async function ReturnsPage() {
  const list = await prisma.return.findMany({
    include: {
      epp:  { select: { code: true, name: true } },
      user: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const data = list.map((r) => ({
    id:         r.id,
    date:       r.createdAt.toISOString(),
    eppCode:    r.epp.code,
    eppName:    r.epp.name,
    employee:   r.employee,
    quantity:   r.quantity,
    condition:  r.condition,
    operator:   r.user.name ?? r.user.email,
  }));

  return (
    <section className="space-y-6 px-4 md:px-8 py-6">
      <header className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Devoluciones</h1>
        <Link href="/returns/new">
          <Button>+ Nueva Devolución</Button>
        </Link>
      </header>

      <div className="overflow-x-auto bg-white rounded shadow">
        <ReturnTable data={data} />
      </div>
    </section>
  );
}
