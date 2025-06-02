import prisma from "@/lib/prisma";
import DeliveryBatchForm from "@/components/delivery/DeliveryBatchForm";

export default async function NewDeliveryPage() {
  const users = await prisma.user.findMany({ select:{id:true,name:true,email:true}, orderBy:{name:"asc"} });
  const opts  = users.map(u=>({ id:u.id, label:u.name ?? u.email, email:u.email }));
  return (
    <section className="space-y-8 px-4 md:px-8 py-6">
      <header className="border-b pb-4">
        <h1 className="text-3xl font-semibold">Registrar Entrega de EPPs</h1>
      </header>
      <DeliveryBatchForm users={opts}/>
    </section>
  );
}
