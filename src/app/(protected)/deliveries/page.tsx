import prisma from "@/lib/prisma";
import DeliveryBatchesClient from "@/components/delivery/DeliveryBatchesClient";

export const revalidate = 0;

export default async function DeliveriesPage() {
  const list = await prisma.deliveryBatch.findMany({
    select: {
      id:             true,
      code:           true,
      createdAt:      true,
      collaboratorId: true,
      warehouseId:    true,
      note:           true,
      collaborator:   { select: { name: true } },
      user:           { select: { name: true, email: true } },
      _count:         { select: { deliveries: true } },
      // Ya no pedimos warehouseId dentro de cada delivery:
      deliveries:    { select: { eppId: true, quantity: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return <DeliveryBatchesClient list={list} />;
}
