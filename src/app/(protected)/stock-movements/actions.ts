"use server";

import prisma from "@/lib/prisma";
import { stockMovementSchema } from "@/schemas/stock-movement-schema";
import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";

export async function createMovement(fd: FormData) {
  // 1. Parseo y validación inicial
  const data = stockMovementSchema.parse(Object.fromEntries(fd));

  // 2. Obtengo userId de Clerk y luego mi tabla User
  const { userId: clerkId } = await auth();
  if (!clerkId) throw new Error("No autorizado");

  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) throw new Error("Usuario no encontrado");

  // 3. Transacción: creo movimiento y actualizo stock
  await prisma.$transaction(async (tx) => {
    // 3.1. Cargo el EPP
    const epp = await tx.ePP.findUnique({ where: { id: data.eppId } });
    if (!epp) throw new Error("EPP no existe");

    // 3.2. Valido stock para salidas
    if (data.type === "EXIT" && data.quantity > epp.stock) {
      throw new Error(`Stock insuficiente (disponible ${epp.stock})`);
    }

    // 3.3. Creo el movimiento
    await tx.stockMovement.create({
      data: {
        eppId: data.eppId,
        type: data.type,
        quantity: data.quantity,
        note: data.note,
        userId: user.id,
      },
    });

    // 3.4. Defino la operación de stock según el tipo
    let updateData: { increment?: number; decrement?: number; set?: number } = {};
    if (data.type === "ENTRY") {
      updateData = { increment: data.quantity };
    } else if (data.type === "EXIT") {
      updateData = { decrement: data.quantity };
    } else {
      updateData = { set: data.quantity };
    }

    // 3.5. Aplico la actualización de stock
    await tx.ePP.update({
      where: { id: data.eppId },
      data: { stock: updateData },
    });
  });

  // 4. Revalido paths para refrescar la UI
  revalidatePath("/stock-movements");
  revalidatePath("/epps");
}

export async function deleteMovement(id: number) {
  const movement = await prisma.stockMovement.findUnique({ where: { id } });
  if (!movement) throw new Error("Movimiento no encontrado");
  if (movement.type === "ADJUSTMENT") throw new Error("No se puede deshacer un ajuste");

  await prisma.$transaction(async (tx) => {
    await tx.stockMovement.delete({ where: { id } });
    await tx.ePP.update({
      where: { id: movement.eppId },
      data: {
        stock:
          movement.type === "ENTRY"
            ? { decrement: movement.quantity }
            : { increment: movement.quantity },
      },
    });
  });

  revalidatePath("/stock-movements");
  revalidatePath("/epps");
}
