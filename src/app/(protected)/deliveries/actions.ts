"use server";

import prisma from "@/lib/prisma";
import { deliveryBatchSchema } from "@/schemas/delivery-batch-schema";
import { ensureClerkUser } from "@/lib/user-sync";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";

export async function createDeliveryBatch(fd: FormData) {
  // 1) parsear y validar payload JSON
  const payload = JSON.parse(fd.get("payload") as string);
  const data = deliveryBatchSchema.parse(payload);
  const user = await ensureClerkUser();

  // 2) crear batch + validar existencia en cada row
  const batchId = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const { id } = await tx.deliveryBatch.create({
      data: {
        employee: data.employee,
        note:     data.note,
        warehouseId: data.items[0].warehouseId, 
        userId:   user.id,
      },
      select: { id: true },
    });

    // 3) Validar stock y preparar renglones
    const rows = await Promise.all(
      data.items.map(async (it) => {
        // 3.1) Revisar inventario en EPPStock para it.eppId + it.warehouseId
        const stockRow = await tx.ePPStock.findUnique({
          where: { eppId_warehouseId: { eppId: it.eppId, warehouseId: it.warehouseId } },
          select: { quantity: true },
        });
        if (!stockRow || stockRow.quantity < it.quantity) {
          // obtener nombre de EPP para mensaje de error
          const eppName = await tx.ePP.findUnique({ where: { id: it.eppId }, select: { name: true } });
          throw new Error(`Stock insuficiente para «${eppName?.name ?? it.eppId}» en almacén`);
        }
        return {
          batchId:    id,
          eppId:      it.eppId,
          warehouseId: it.warehouseId,
          quantity:   it.quantity,
        };
      })
    );

    // 4) Crear renglones de forma masiva
    await tx.delivery.createMany({ 
      data: rows.map((r) => ({
        batchId:  r.batchId,
        eppId:    r.eppId,
        quantity: r.quantity,
      })),
    });

    // 5) Descontar stock en cada almacén
    for (const r of rows) {
      await tx.ePPStock.update({
        where: { eppId_warehouseId: { eppId: r.eppId, warehouseId: r.warehouseId } },
        data: { quantity: { decrement: r.quantity } },
      });
      // 5.1) Registrar movimiento TRANSFER_OUT (en realidad es “Salida”)
      await tx.stockMovement.create({
        data: {
          type:        "EXIT",
          eppId:       r.eppId,
          warehouseId: r.warehouseId,
          quantity:    r.quantity,
          note:        `Entrega batch ${id}`,
          userId:      user.id,
        },
      });
    }

    return id;
  });

  // 6) Revalidar rutas
  ["/deliveries", "/epps", "/dashboard"].forEach((p) => revalidatePath(p));
  return batchId;
}

export async function deleteDeliveryRow(id: number) {
  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // 1) Obtener fila y su warehouse
    const row = await tx.delivery.findUnique({
      where: { id },
      select: { id: true, eppId: true, quantity: true, batch: { select: { warehouseId: true } } },
    });
    if (!row) throw new Error("Renglón no encontrado");

    // 2) Borrar renglón
    await tx.delivery.delete({ where: { id } });

    // 3) Reponer stock en EPPStock
    await tx.ePPStock.update({
      where: { eppId_warehouseId: { eppId: row.eppId, warehouseId: row.batch.warehouseId } },
      data: { quantity: { increment: row.quantity } },
    });

    // 4) Registrar movimiento TRANSFER_IN (o ENTRY) para devolverse al almacén
    await tx.stockMovement.create({
      data: {
        type:        "ENTRY",
        eppId:       row.eppId,
        warehouseId: row.batch.warehouseId,
        quantity:    row.quantity,
        note:        `Deshacer entrega ${row.id}`,
        userId:      (await ensureClerkUser()).id,
      },
    });
  });

  ["/deliveries", "/epps", "/dashboard"].forEach((p) => revalidatePath(p));
}

export async function deleteBatch(batchId: number) {
  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const rows = await tx.delivery.findMany({
      where: { batchId },
      select: { id: true, eppId: true, quantity: true, batch: { select: { warehouseId: true } } },
    });
    if (rows.length === 0) throw new Error("Lote vacío o no existe");

    // Reponer stock para cada renglón
    for (const r of rows) {
      await tx.ePPStock.update({
        where: { eppId_warehouseId: { eppId: r.eppId, warehouseId: r.batch.warehouseId } },
        data: { quantity: { increment: r.quantity } },
      });
      await tx.stockMovement.create({
        data: {
          type:        "ENTRY",
          eppId:       r.eppId,
          warehouseId: r.batch.warehouseId,
          quantity:    r.quantity,
          note:        `Deshacer batch ${batchId}`,
          userId:      (await ensureClerkUser()).id,
        },
      });
    }

    // Borrar renglones y cabecera
    await tx.delivery.deleteMany({ where: { batchId } });
    await tx.deliveryBatch.delete({ where: { id: batchId } });
  });

  ["/deliveries", "/epps", "/dashboard"].forEach((p) => revalidatePath(p));
}
