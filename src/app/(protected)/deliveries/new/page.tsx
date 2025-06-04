import prisma from "@/lib/prisma";
import DeliveryBatchForm from "@/components/delivery/DeliveryBatchForm";

export default async function NewDeliveryPage() {
  // 1) Traer lista de usuarios (receptores posibles)
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });
  const userOptions = users.map((u) => ({
    id: u.id,
    label: u.name ?? u.email, // si name es null, muestra el email
    email: u.email,
  }));

  // 2) Traer lista de almacenes
  const warehouses = await prisma.warehouse.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  const warehouseOptions = warehouses.map((w) => ({
    id: w.id,
    label: w.name,
  }));

  return (
    <section className="space-y-8 px-4 md:px-8 py-6">
      <header className="border-b pb-4">
        <h1 className="text-3xl font-semibold">Registrar Entrega de EPPs</h1>
      </header>
      <div className="max-w-3xl mx-auto">
        <DeliveryBatchForm users={userOptions} warehouses={warehouseOptions} />
      </div>
    </section>
  );
}
