import prisma from "@/lib/prisma";
import TransferForm from "@/components/warehouses/TransferForm";

export default async function TransferPage() {
  // Solo necesitamos los almacenes; ComboboxEpp se auto-alimenta con fetch
  const warehouses = await prisma.warehouse.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  const warehouseOptions = warehouses.map((w) => ({
    id: w.id,
    label: w.name,
  }));

  return (
    <section className="space-y-6 px-4 md:px-8 py-6">
      <h1 className="text-3xl font-semibold">Transferir inventario</h1>
      <div className="max-w-lg mx-auto">
        <TransferForm warehouses={warehouseOptions} />
      </div>
    </section>
  );
}
