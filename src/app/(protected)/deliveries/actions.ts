// src/app/(protected)/deliveries/actions.ts
"use server";

import prisma from "@/lib/prisma";
import { deliverySchema } from "@/schemas/delivery-schema";
import { revalidatePath } from "next/cache";
import { ensureClerkUser } from "@/lib/user-sync";

/**
 * Crea una nueva entrega y decrementa el stock correspondiente.
 */
export async function createDelivery(fd: FormData) {
  const data = deliverySchema.parse(Object.fromEntries(fd));
  const operator = await ensureClerkUser();

  await prisma.$transaction([
    prisma.delivery.create({
      data: {
        eppId:    data.eppId,
        employee: data.employee,
        quantity: data.quantity,
         userId:   operator.id,
      },
    }),
    prisma.ePP.update({
      where: { id: data.eppId },
      data:  { stock: { decrement: data.quantity } },
    }),
  ]);

  revalidatePath("/deliveries");
  revalidatePath("/epps");
}

/**
 * Elimina una entrega existente y repone el stock.
 */
export async function deleteDelivery(id: number) {
  // Recupera la entrega para saber cantidad y eppId
  const delivery = await prisma.delivery.findUnique({ where: { id } });
  if (!delivery) {
    throw new Error("Entrega no encontrada");
  }

  await prisma.$transaction([
    // Borramos el registro de entrega
    prisma.delivery.delete({ where: { id } }),
    // Reponemos el stock (incrementamos)
    prisma.ePP.update({
      where: { id: delivery.eppId },
      data:  { stock: { increment: delivery.quantity } },
    }),
  ]);

  revalidatePath("/deliveries");
  revalidatePath("/epps");
}
