// src/app/(protected)/deliveries/[id]/page.tsx
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type DeliveryEntry = {
  id: number;
  quantity: number;
  epp: {
    code: string;
    name: string;
  };
};

// En Next 15: params viene como Promise<{ id: string }>
type Props = {
  params: Promise<{ id: string }>;
};

export default async function DeliveryBatchDetail({ params }: Props) {
  // “await params” es obligatorio para cumplir con el nuevo tipo
  const { id } = await params;

  const batch = await prisma.deliveryBatch.findUnique({
    where: { id: Number(id) },
    include: {
      user: { select: { name: true, email: true } },
      deliveries: {
        include: { epp: { select: { code: true, name: true } } },
        orderBy: { id: "asc" },
      },
    },
  });

  if (!batch) notFound();

  return (
    <section className="space-y-6 px-4 md:px-8 py-6">
      <header className="flex items-center gap-4">
        <h1 className="text-3xl font-bold">Entrega #{batch.id}</h1>
        <Badge variant="secondary">{batch.employee}</Badge>
        <span className="text-sm text-muted-foreground">
          {batch.createdAt.toLocaleString()}
        </span>
      </header>

      <p className="text-sm">
        Operador: <strong>{batch.user.name ?? batch.user.email}</strong>
      </p>
      {batch.note && (
        <p className="text-sm">
          Nota: <em>{batch.note}</em>
        </p>
      )}

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
            {batch.deliveries.map((r: DeliveryEntry) => (
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
        <Button variant="outline" className="mt-4">
          ← Volver
        </Button>
      </Link>
    </section>
  );
}
