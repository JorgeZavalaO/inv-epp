"use server";

import prisma from "@/lib/prisma";
import { ensureClerkUser } from "@/lib/user-sync";
import { z } from "zod";
import { revalidatePath } from "next/cache";

const transferSchema = z
  .object({
    eppId:    z.number().int().positive("EPP inválido"),
    fromId:   z.number().int().positive("Almacén origen inválido"),
    toId:     z.number().int().positive("Almacén destino inválido"),
    quantity: z.number().int().positive("Cantidad debe ser > 0"),
    note:     z.string().max(255).optional(),
  })
  .refine((data) => data.fromId !== data.toId, {
    message: "Origen y destino deben ser distintos",
    path: ["toId"],
  });

export async function transferStock(payload: unknown) {
  // 1) Validar payload con Zod
  const data = transferSchema.parse(payload);
  const user = await ensureClerkUser();

  await prisma.$transaction(async (tx) => {
    // 2) Verificar stock en almacén origen
    const origin = await tx.ePPStock.findUnique({
      where: {
        eppId_warehouseId: { eppId: data.eppId, warehouseId: data.fromId },
      },
      select: { quantity: true },
    });
    if (!origin || origin.quantity < data.quantity) {
      throw new Error("Stock insuficiente en almacén origen");
    }

    // 3) Descontar del origen
    await tx.ePPStock.update({
      where: {
        eppId_warehouseId: { eppId: data.eppId, warehouseId: data.fromId },
      },
      data: { quantity: { decrement: data.quantity } },
    });

    // 4) Agregar al destino (upsert)
    await tx.ePPStock.upsert({
      where: {
        eppId_warehouseId: { eppId: data.eppId, warehouseId: data.toId },
      },
      create: {
        eppId: data.eppId,
        warehouseId: data.toId,
        quantity: data.quantity,
      },
      update: {
        quantity: { increment: data.quantity },
      },
    });

    // 5) Registrar movimiento de salida
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
    // 6) Registrar movimiento de entrada
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

  // 7) Invalidar caches para refrescar datos
  revalidatePath("/stock-movements");
  revalidatePath("/dashboard");
}

export async function deleteTransfer(id: number) {
  // 1) Buscar movimiento
  const movement = await prisma.stockMovement.findUnique({
    where: { id },
    select: { type: true, eppId: true, warehouseId: true, quantity: true },
  });
  if (!movement) {
    throw new Error("Movimiento no encontrado");
  }

  // 2) Iniciar transacción
  await prisma.$transaction(async (tx) => {
    // 3) Eliminar movimiento
    await tx.stockMovement.delete({ where: { id } });

    // 4) Actualizar stock según tipo de movimiento
    if (movement.type === "TRANSFER_OUT") {
      await tx.ePPStock.update({
        where: {
          eppId_warehouseId: {
            eppId: movement.eppId,
            warehouseId: movement.warehouseId,
          },
        },
        data: { quantity: { increment: movement.quantity } },
      });
    } else if (movement.type === "TRANSFER_IN") {
      await tx.ePPStock.update({
        where: {
          eppId_warehouseId: {
            eppId: movement.eppId,
            warehouseId: movement.warehouseId,
          },
        },
        data: { quantity: { decrement: movement.quantity } },
      });
    }
  });

  // 5) Invalidar cache
  revalidatePath("/stock-movements");
}
