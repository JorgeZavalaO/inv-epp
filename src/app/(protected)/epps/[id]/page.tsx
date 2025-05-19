import prisma from "@/lib/prisma";
import EppForm from "@/components/epp/EppForm";
import { notFound } from "next/navigation";

export default async function EditEppPage({ params }: { params: { id: string } }) {
  const epp = await prisma.ePP.findUnique({ where: { id: Number(params.id) } });
  if (!epp) notFound();

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">Editar EPP</h1>
      <EppForm defaultValues={epp as Parameters<typeof EppForm>[0]['defaultValues']} />
    </section>
  );
}
