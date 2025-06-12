import prisma from "@/lib/prisma";
import DeliveryBatchesClient from "@/components/delivery/DeliveryBatchesClient";

export const revalidate = 0;

export default async function DeliveriesPage() {
  const rawList = await prisma.deliveryBatch.findMany({
    select: {
      id: true,
      code: true,
      createdAt: true,
      collaboratorId: true,
      warehouseId: true,
      note: true,
      collaborator: { select: { name: true } },
      user: { select: { name: true, email: true } },
      _count: { select: { deliveries: true } },
      deliveries: { select: { eppId: true, quantity: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Serializamos createdAt a string para evitar problemas de Date en el cliente
  const list = rawList.map((b) => ({
    ...b,
    createdAt: b.createdAt.toISOString(),
  }));

  return <DeliveryBatchesClient list={list} />;
}
