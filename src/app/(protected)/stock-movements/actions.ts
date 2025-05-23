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
        eppId:   data.eppId,
        type:    data.type,
        quantity:data.quantity,
        note:    data.note,
        userId:  dbUser.id,
      },
    }),
    prisma.ePP.update({
      where: { id: data.eppId },
      data:
        data.type === "ENTRY"
          ? { stock: { increment: data.quantity } }
        : data.type === "EXIT"
          ? { stock: { decrement: data.quantity } }
        : { stock: data.quantity },
    }),
  ]);

  revalidatePath("/stock-movements");
  revalidatePath("/epps");
}

export async function deleteMovement(id: number) {
  const movement = await prisma.stockMovement.findUniqueOrThrow({ where: { id } });
  if (movement.type === "ADJUSTMENT") throw new Error("No se puede deshacer un ajuste.");
  
  await prisma.$transaction([
    prisma.stockMovement.delete({ where: { id } }),
    prisma.ePP.update({
      where: { id: movement.eppId },
      data: movement.type === "ENTRY"
        ? { stock: { decrement: movement.quantity } }
        : { stock: { increment: movement.quantity } },
    }),
  ]);

  revalidatePath("/stock-movements");
  revalidatePath("/epps");
}
