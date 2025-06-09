"use server";

import prisma from "@/lib/prisma";
import { stockMovementSchema } from "@/schemas/stock-movement-schema";
import { revalidatePath } from "next/cache";
import { ensureClerkUser } from "@/lib/user-sync";

export async function createMovement(fd: FormData) {
  const data = stockMovementSchema.parse(Object.fromEntries(fd));
  const dbUser = await ensureClerkUser();

  await prisma.$transaction([
    prisma.stockMovement.create({
      data: {
        eppId:       data.eppId,
        warehouseId: data.warehouseId,
        type:        data.type,
        quantity:    data.quantity,
        note:        data.note,
        userId:      dbUser.id,
      },
    }),
    prisma.ePPStock.upsert({
      where: {
        eppId_warehouseId: {
          eppId:       data.eppId,
          warehouseId: data.warehouseId,
        },
      },
      update: {
        quantity:
          data.type === "ENTRY"
            ? { increment: data.quantity }
            : data.type === "EXIT"
            ? { decrement: data.quantity }
            : { set: data.quantity },
      },
      create: {
        eppId:       data.eppId,
        warehouseId: data.warehouseId,
        quantity:    data.quantity,
      },
    }),
  ]);

  revalidatePath("/stock-movements");
  revalidatePath("/epps");
}

export async function deleteMovement(id: number) {
  const movement = await prisma.stockMovement.findUniqueOrThrow({ where: { id } });
  if (movement.type !== "ADJUSTMENT" && movement.quantity === 0) {
    throw new Error("La cantidad debe ser mayor que 0 para ENTRADA / SALIDA");
  }

  await prisma.$transaction([
    prisma.stockMovement.delete({ where: { id } }),
    prisma.ePPStock.update({
      where: {
        eppId_warehouseId: {
          eppId:       movement.eppId,
          warehouseId: movement.warehouseId,
        },
      },
      data: {
        quantity:
          movement.type === "ENTRY"
            ? { decrement: movement.quantity }
            : { increment: movement.quantity },
      },
    }),
  ]);

  revalidatePath("/stock-movements");
  revalidatePath("/epps");
  revalidatePath("/dashboard");
}
