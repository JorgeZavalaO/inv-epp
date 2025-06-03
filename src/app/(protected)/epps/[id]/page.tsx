import prisma from "@/lib/prisma";
import EppForm from "@/components/epp/EppForm";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditEppPage({ params }: Props) {
  // “await params” es obligatorio para que TypeScript reconozca el tipo correctamente
  const { id } = await params;

  const epp = await prisma.ePP.findUnique({ where: { id: Number(id) } });
  if (!epp) notFound();

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">Editar EPP</h1>
      <EppForm defaultValues={epp as Parameters<typeof EppForm>[0]["defaultValues"]} />
    </section>
  );
}
