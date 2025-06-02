// src/app/(protected)/deliveries/page.tsx
import prisma from "@/lib/prisma";
import DeliveryBatchTable from "@/components/delivery/DeliveryBatchTable";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const revalidate = 0;

export default async function DeliveriesPage() {
  const batches = await prisma.deliveryBatch.findMany({
    include: {
      _count: { select: { deliveries: true } },
      user:   { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const data = batches.map((b) => ({
    id:       b.id,
    date:     b.createdAt.toISOString(),
    employee: b.employee,
    operator: b.user.name ?? b.user.email!,
    items:    b._count.deliveries,
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
        <DeliveryBatchTable data={data} />
      </div>
    </section>
  );
}
