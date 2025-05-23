import prisma from "@/lib/prisma";
import DeliveryForm from "@/components/delivery/DeliveryForm";

export default async function NewDeliveryPage() {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  // Prepara opciones: {id, label}
  const options = users.map(u => ({
    id:    u.id,
    label: u.name ?? u.email,
    email:   u.email,
  }));

  return (
    <section className="space-y-8 px-4 md:px-8 py-6">
      <header className="border-b pb-4">
        <h1 className="text-3xl font-semibold">Registrar Entrega de EPP</h1>
      </header>
      <div className="max-w-2xl mx-auto">
        <DeliveryForm users={options} />
      </div>
    </section>
  );
}
