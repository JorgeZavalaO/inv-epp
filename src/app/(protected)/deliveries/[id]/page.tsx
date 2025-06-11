import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import Link      from "next/link";
import { Button }from "@/components/ui/button";

export default async function DeliveryBatchDetail({
  params,
}: {
  params: { id: string };
}) {
  const b = await prisma.deliveryBatch.findUnique({
    where: { id: Number(params.id) },
    include: {
      collaborator: { select: { name: true, position: true, location: true } },
      user:         { select: { name: true, email: true } },
      deliveries:  {
        include: { epp: { select: { code: true, name: true } } },
        orderBy: { id: "asc" },
      },
      warehouse:   { select: { name: true } },
    },
  });
  if (!b) notFound();

  return (
    <section className="space-y-6 px-4 md:px-8 py-6">
      <header className="flex items-center gap-4">
        <h1 className="text-3xl font-bold">Entrega #{b.code}</h1>
        <Badge variant="secondary">{b.deliveries.length} ítems</Badge>
      </header>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-1">
          <p><strong>Colaborador:</strong> {b.collaborator.name}</p>
          <p><strong>Cargo:</strong>       {b.collaborator.position ?? "-"}</p>
          <p><strong>Ubicación:</strong>   {b.collaborator.location ?? "-"}</p>
        </div>
        <div className="space-y-1">
          <p><strong>Operador:</strong>    {b.user.name ?? b.user.email}</p>
          {b.note && <p><strong>Nota:</strong> {b.note}</p>}
          <p><strong>Almacén:</strong>    {b.warehouse.name}</p>
        </div>
      </div>

      <div className="overflow-x-auto bg-white rounded shadow">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="px-3 py-2 text-left">Código</th>
              <th className="px-3 py-2 text-left">EPP</th>
              <th className="px-3 py-2 text-right">Cantidad</th>
            </tr>
          </thead>
          <tbody>
            {b.deliveries.map((r) => (
              <tr key={r.id} className="border-b">
                <td className="px-3 py-2">{r.epp.code}</td>
                <td className="px-3 py-2">{r.epp.name}</td>
                <td className="px-3 py-2 text-right">{r.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Link href="/deliveries">
        <Button variant="outline">← Volver</Button>
      </Link>
    </section>
  );
}
