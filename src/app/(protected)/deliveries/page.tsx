import prisma from "@/lib/prisma";
import DeliveryTable from "@/components/delivery/DeliveryTable";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const revalidate = 0;

export default async function DeliveriesPage() {
  const list = await prisma.delivery.findMany({
    include: {
      epp:  { select: { code: true, name: true } },
      user: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const data = list.map((d) => ({
    id:       d.id,
    date:     d.createdAt.toISOString(),
    eppCode:  d.epp.code,
    eppName:  d.epp.name,
    employee: d.employee,
    quantity: d.quantity,
    operator: d.user.name ?? d.user.email!,
  }));

  return (
    <section className="space-y-6 px-4 md:px-8 py-6">
      <header className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Entregas</h1>
        <Link href="/deliveries/new">
          <Button>+ Nueva Entrega</Button>
        </Link>
      </header>
      <div className="overflow-x-auto bg-white rounded shadow">
        <DeliveryTable data={data} />
      </div>
    </section>
  );
}
