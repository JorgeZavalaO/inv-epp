"use server";

import prisma from "@/lib/prisma";
import { deliveryBatchSchema } from "@/schemas/delivery-batch-schema";
import { ensureClerkUser } from "@/lib/user-sync";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

export async function createDeliveryBatch(fd: FormData) {
  const payload = JSON.parse(fd.get("payload") as string);
  let data;
  try {
    data = deliveryBatchSchema.parse(payload);
  } catch (e) {
    if (e instanceof z.ZodError) {
      throw new Error("Error de validación: " + e.errors.map((x) => x.message).join(", "));
    }
    throw e;
  }

  const operator = await ensureClerkUser();

  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // Generar código
    const last = await tx.deliveryBatch.findFirst({
      where: { code: { startsWith: "DEL-" } },
      orderBy: { code: "desc" },
      select: { code: true },
    });
    const num  = last ? Number(last.code.replace("DEL-", "")) + 1 : 1;
    const code = `DEL-${String(num).padStart(4, "0")}`;

    // Crear batch
  const { id } = await tx.deliveryBatch.create({
      data: {
        code,
        collaboratorId: data.collaboratorId,
        note:           data.note,
        warehouseId:    data.warehouseId,
        userId:         operator.id,
      },
      select: { id: true },
    });

    // Validar stock y armar rows usando data.warehouseId
    const rows = await Promise.all(
      data.items.map(async (it) => {
        const stockRow = await tx.ePPStock.findUnique({
          where: { eppId_warehouseId: { eppId: it.eppId, warehouseId: data.warehouseId } },
          select: { quantity: true },
        });
        if (!stockRow || stockRow.quantity < it.quantity) {
          const e = await tx.ePP.findUnique({ where: { id: it.eppId }, select: { name: true } });
          throw new Error(`Stock insuficiente para «${e?.name ?? it.eppId}»`);
        }
        return { batchId: id, eppId: it.eppId, quantity: it.quantity };
      })
    );

    // Crear entregas
    await tx.delivery.createMany({ data: rows });

    // Descontar stock y registrar movimientos
    for (const r of rows) {
      await tx.ePPStock.update({
        where: { eppId_warehouseId: { eppId: r.eppId, warehouseId: data.warehouseId } },
        data:  { quantity: { decrement: r.quantity } },
      });
      await tx.stockMovement.create({
        data: {
          type:        "EXIT",
          eppId:       r.eppId,
          warehouseId: data.warehouseId,
          quantity:    r.quantity,
          note:        `Entrega ${code}`,
          userId:      operator.id,
        },
      });
    }

    return { id, code };
  });

  ["deliveries", "dashboard", "epps"].forEach((p) => revalidatePath(`/${p}`));
  return result;
}


export async function updateDeliveryBatch(fd: FormData) {
  const raw = JSON.parse(fd.get("payload") as string);
  let data;
  try {
    const editSchema = z.object({
      batchId: z.number().int().positive().optional(),
      id: z.number().int().positive().optional(),
      collaboratorId: z.number().int().positive(),
      note: z.string().max(255).optional(),
    });
    data = editSchema.parse(raw);
  } catch (e) {
    if (e instanceof z.ZodError) {
      throw new Error("Error de validación: " + e.errors.map((x) => x.message).join(", "));
    }
    throw e;
  }

  const batchId = data.batchId ?? data.id;
  if (!batchId) throw new Error("Identificador de lote (batchId) faltante");

  const updated = await prisma.deliveryBatch.update({
    where: { id: batchId },
    data: { collaboratorId: data.collaboratorId, note: data.note },
    select: { id: true, code: true },
  });
  revalidatePath("/deliveries");
  return updated;
}

export async function deleteBatch(batchId: number) {
  const operator = await ensureClerkUser();

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const rows = await tx.delivery.findMany({
      where: { batchId },
      select: {
        eppId:   true,
        quantity:true,
        batch:   { select: { warehouseId: true } },
      },
    });
    if (rows.length === 0) throw new Error("Lote vacío o no existe");

    for (const r of rows) {
      await tx.ePPStock.update({
        where: {
          eppId_warehouseId: {
            eppId:       r.eppId,
            warehouseId: r.batch.warehouseId,
          },
        },
        data: { quantity: { increment: r.quantity } },
      });
      await tx.stockMovement.create({
        data: {
          type:        "ENTRY",
          eppId:       r.eppId,
          warehouseId: r.batch.warehouseId,
          quantity:    r.quantity,
          note:        `Deshacer lote ${batchId}`,
          userId:      operator.id,
        },
      });
    }

    await tx.delivery.deleteMany({ where: { batchId } });
    await tx.deliveryBatch.delete({ where: { id: batchId } });
  });

  ["deliveries", "dashboard", "epps"].forEach((p) => revalidatePath(`/${p}`));
}