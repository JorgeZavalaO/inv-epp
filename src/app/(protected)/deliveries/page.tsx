import prisma from "@/lib/prisma";
import DeliveryTable from "@/components/delivery/DeliveryTable";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const revalidate = 0;

export default async function DeliveriesPage() {
  // 1) Traer entregas uniendo batches y EPP
  const list = await prisma.delivery.findMany({
    include: {
      epp: { select: { code: true, name: true } },
      batch: {
        select: {
          employee: true,
          warehouse: { select: { name: true } },
          user: { select: { name: true, email: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  // 2) Mapear datos para tabla
  const data = list.map((d) => ({
    id:        d.id,
    date:      d.createdAt.toISOString(),
    eppCode:   d.epp.code,
    eppName:   d.epp.name,
    employee:  d.batch.employee,
    warehouse: d.batch.warehouse.name,
    quantity:  d.quantity,
    operator:  d.batch.user.name ?? d.batch.user.email!,
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
