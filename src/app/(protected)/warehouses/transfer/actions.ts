// src/app/(protected)/warehouses/transfer/actions.ts
"use server";

import prisma from "@/lib/prisma";
import { ensureClerkUser } from "@/lib/user-sync";
import { z } from "zod";
import { revalidatePath } from "next/cache";

const transferSchema = z.object({
  eppId:    z.number().int().positive("EPP inválido"),
  fromId:   z.number().int().positive("Almacén origen inválido"),
  toId:     z.number().int().positive("Almacén destino inválido"),
  quantity: z.number().int().positive("Cantidad debe ser > 0"),
  note:     z.string().max(255).optional(),
}).refine(
  (data) => data.fromId !== data.toId,
  { message: "Origen y destino deben ser distintos", path: ["toId"] }
);


export async function transferStock(payload: unknown) {
  const data = transferSchema.parse(payload);
  const user = await ensureClerkUser();

  await prisma.$transaction(async (tx) => {
    // 1) Verificar existencia en almacén origen
    const origin = await tx.ePPStock.findUnique({
      where: { eppId_warehouseId: { eppId: data.eppId, warehouseId: data.fromId } },
      select: { quantity: true },
    });
    if (!origin || origin.quantity < data.quantity) {
      throw new Error("Stock insuficiente en almacén origen");
    }

    // 2) Actualizar existencias simultáneamente
    await tx.ePPStock.update({
      where: { eppId_warehouseId: { eppId: data.eppId, warehouseId: data.fromId } },
      data:  { quantity: { decrement: data.quantity } },
    });
    await tx.ePPStock.upsert({
      where: { eppId_warehouseId: { eppId: data.eppId, warehouseId: data.toId } },
      create: { eppId: data.eppId, warehouseId: data.toId, quantity: data.quantity },
      update: { quantity: { increment: data.quantity } },
    });

    // 3) Registrar movimientos en ambos almacenes
    await tx.stockMovement.create({
      data: {
        type:        "TRANSFER_OUT",
        eppId:       data.eppId,
        warehouseId: data.fromId,
        quantity:    data.quantity,
        note:        data.note,
        userId:      user.id,
      },
    });
    await tx.stockMovement.create({
      data: {
        type:        "TRANSFER_IN",
        eppId:       data.eppId,
        warehouseId: data.toId,
        quantity:    data.quantity,
        note:        data.note,
        userId:      user.id,
      },
    });
  });

  revalidatePath("/stock-movements");
  revalidatePath("/dashboard");
}
