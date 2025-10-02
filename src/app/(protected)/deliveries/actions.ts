"use server";

import prisma from "@/lib/prisma";
import { deliveryBatchSchema } from "@/schemas/delivery-batch-schema";
import { ensureClerkUser } from "@/lib/user-sync";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { auditCreate, auditUpdate, auditDelete } from "@/lib/audit/logger";

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

  // SOLUCIÓN ANTI-DUPLICACIÓN: Implementar retry logic con índice único
  // Si dos usuarios crean entregas simultáneamente y obtienen el mismo código,
  // el índice único causará un error P2002. Reintentamos con un nuevo código.
  const MAX_RETRIES = 5;
  let attempt = 0;
  let lastError: Error | null = null;

  while (attempt < MAX_RETRIES) {
    try {
      const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        // Generación de código secuencial con timestamp para mayor unicidad
        const last = await tx.deliveryBatch.findFirst({
          where: { code: { startsWith: "DEL-" } },
          orderBy: { code: "desc" },
          select: { code: true },
        });
        const num  = last ? Number(last.code.replace("DEL-", "")) + 1 : 1;
        const code = `DEL-${String(num).padStart(4, "0")}`;

        // Crear batch (puede fallar si hay conflicto de código único)
        const batch = await tx.deliveryBatch.create({
          data: {
            code,
            collaboratorId: data.collaboratorId,
            note:           data.note,
            warehouseId:    data.warehouseId,
            userId:         operator.id,
          },
          select: { 
            id: true, 
            code: true,
            collaboratorId: true,
            warehouseId: true,
            note: true,
          },
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
            return { batchId: batch.id, eppId: it.eppId, quantity: it.quantity };
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
              note:        `Entrega ${batch.code}`,
              userId:      operator.id,
            },
          });
        }

        return batch;
      });

      // Auditar la creación del delivery batch
      await auditCreate(
        operator.id,
        'DeliveryBatch',
        result.id,
        {
          code: result.code,
          collaboratorId: result.collaboratorId,
          warehouseId: result.warehouseId,
          note: result.note,
          itemCount: data.items.length,
        }
      );

      // Éxito - salir del loop de retry
      ["deliveries", "dashboard", "epps"].forEach((p) => revalidatePath(`/${p}`));
      return result;

    } catch (error: unknown) {
      // Verificar si es un error de conflicto de código único (Prisma P2002)
      const isPrismaError = error && typeof error === 'object' && 'code' in error;
      const isUniqueConstraintError = isPrismaError && (error as { code: string }).code === 'P2002';

      if (isUniqueConstraintError && attempt < MAX_RETRIES - 1) {
        // Conflicto de código único detectado, reintentar con delay exponencial
        attempt++;
        lastError = error instanceof Error ? error : new Error(String(error));
        // Delay exponencial: 50ms, 100ms, 200ms, 400ms, 800ms
        await new Promise(resolve => setTimeout(resolve, 50 * Math.pow(2, attempt - 1)));
        continue;
      }

      // Si no es un error de unicidad o ya agotamos los reintentos, lanzar el error
      throw error;
    }
  }

  // Si llegamos aquí, agotamos todos los reintentos
  throw new Error(`No se pudo crear la entrega después de ${MAX_RETRIES} intentos. ${lastError?.message || ''}`);
}


export async function updateDeliveryBatch(fd: FormData) {
  const raw = JSON.parse(fd.get("payload") as string);
  let data;
  try {
    const itemSchema = z.object({
      eppId: z.number().int().positive(),
      quantity: z.number().int().positive(),
    });

    const editSchema = z.object({
      batchId: z.number().int().positive().optional(),
      id: z.number().int().positive().optional(),
      collaboratorId: z.number().int().positive(),
      note: z.string().max(255).optional(),
      items: z.array(itemSchema).optional(),
    });

    data = editSchema.parse(raw);
  } catch (e) {
    if (e instanceof z.ZodError) {
      throw new Error("Error de validación: " + e.errors.map((x) => x.message).join(", "));
    }
    throw e;
  }

  const operator = await ensureClerkUser();
  const batchId = data.batchId ?? data.id;
  if (!batchId) throw new Error("Identificador de lote (batchId) faltante");
  
  // Hacer todo en transacción: leer previo, reconciliar items y actualizar batch
  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const before = await tx.deliveryBatch.findUnique({
      where: { id: batchId },
      select: { id: true, code: true, collaboratorId: true, note: true, warehouseId: true, collaborator: { select: { name: true } } },
    });
    if (!before) throw new Error("Lote no encontrado");

    // actualizar collaborator/note
    const updatedBatch = await tx.deliveryBatch.update({
      where: { id: batchId },
      data: { collaboratorId: data.collaboratorId, note: data.note },
      select: { id: true, code: true, collaboratorId: true, note: true, warehouseId: true, collaborator: { select: { name: true } } },
    });

    // Si no vienen items, solo actualizar metadata
    if (!data.items) {
      return { before, after: updatedBatch, summary: [] };
    }

    const warehouseId = updatedBatch.warehouseId;

    // Leer items existentes
    const existing = await tx.delivery.findMany({ where: { batchId }, select: { id: true, eppId: true, quantity: true } });
    const existingMap = new Map<number, { id: number; quantity: number }>();
    for (const ex of existing) existingMap.set(ex.eppId, { id: ex.id, quantity: ex.quantity });

    const summary: string[] = [];

    // Procesar incoming items
    for (const it of data.items) {
      const ex = existingMap.get(it.eppId);
      if (!ex) {
        // Nuevo ítem: validar stock
        const stockRow = await tx.ePPStock.findUnique({ where: { eppId_warehouseId: { eppId: it.eppId, warehouseId } }, select: { quantity: true } });
        if (!stockRow || stockRow.quantity < it.quantity) {
          const e = await tx.ePP.findUnique({ where: { id: it.eppId }, select: { name: true } });
          throw new Error(`Stock insuficiente para «${e?.name ?? it.eppId}»`);
        }
        await tx.delivery.create({ data: { batchId, eppId: it.eppId, quantity: it.quantity } });
        await tx.ePPStock.update({ where: { eppId_warehouseId: { eppId: it.eppId, warehouseId } }, data: { quantity: { decrement: it.quantity } } });
        await tx.stockMovement.create({ data: { type: "EXIT", eppId: it.eppId, warehouseId, quantity: it.quantity, note: `Entrega ${updatedBatch.code}`, userId: operator.id } });
        summary.push(`Añadido EPP ${it.eppId} x${it.quantity}`);
      } else if (ex.quantity !== it.quantity) {
        if (it.quantity > ex.quantity) {
          const delta = it.quantity - ex.quantity;
          const stockRow = await tx.ePPStock.findUnique({ where: { eppId_warehouseId: { eppId: it.eppId, warehouseId } }, select: { quantity: true } });
          if (!stockRow || stockRow.quantity < delta) {
            const e = await tx.ePP.findUnique({ where: { id: it.eppId }, select: { name: true } });
            throw new Error(`Stock insuficiente para aumentar «${e?.name ?? it.eppId}» en ${delta}`);
          }
          await tx.delivery.update({ where: { id: ex.id }, data: { quantity: it.quantity } });
          await tx.ePPStock.update({ where: { eppId_warehouseId: { eppId: it.eppId, warehouseId } }, data: { quantity: { decrement: delta } } });
          await tx.stockMovement.create({ data: { type: "EXIT", eppId: it.eppId, warehouseId, quantity: delta, note: `Ajuste entrega ${updatedBatch.code}`, userId: operator.id } });
          summary.push(`Incrementado EPP ${it.eppId} +${delta}`);
        } else {
          const delta = ex.quantity - it.quantity;
          await tx.delivery.update({ where: { id: ex.id }, data: { quantity: it.quantity } });
          await tx.ePPStock.update({ where: { eppId_warehouseId: { eppId: it.eppId, warehouseId } }, data: { quantity: { increment: delta } } });
          await tx.stockMovement.create({ data: { type: "ENTRY", eppId: it.eppId, warehouseId, quantity: delta, note: `Ajuste entrega ${updatedBatch.code}`, userId: operator.id } });
          summary.push(`Reducido EPP ${it.eppId} -${delta}`);
        }
        existingMap.delete(it.eppId);
      } else {
        // no cambios, borrar de mapa para marcar como procesado
        existingMap.delete(it.eppId);
      }
    }

    // Lo que queda en existingMap son items eliminados
    for (const [eppId, ex] of existingMap.entries()) {
      const qty = ex.quantity;
      await tx.delivery.deleteMany({ where: { batchId, eppId } });
      await tx.ePPStock.update({ where: { eppId_warehouseId: { eppId, warehouseId } }, data: { quantity: { increment: qty } } });
      await tx.stockMovement.create({ data: { type: "ENTRY", eppId, warehouseId, quantity: qty, note: `Eliminado del lote ${updatedBatch.code}`, userId: operator.id } });
      summary.push(`Eliminado EPP ${eppId} x${qty}`);
    }

    return { before, after: updatedBatch, summary };
  });

  // Auditar la actualización
  await auditUpdate(
    operator.id,
    'DeliveryBatch',
    batchId,
    result.before,
    result.after
  );

  revalidatePath("/deliveries");
  return result;
}

export async function deleteBatch(batchId: number) {
  const operator = await ensureClerkUser();

  // Capturar datos ANTES de eliminar para auditoría
  const batchToDelete = await prisma.deliveryBatch.findUnique({
    where: { id: batchId },
    select: {
      id: true,
      code: true,
      collaboratorId: true,
      warehouseId: true,
      note: true,
      deliveries: {
        select: {
          eppId: true,
          quantity: true,
        }
      }
    },
  });

  if (!batchToDelete) {
    throw new Error("Lote no encontrado");
  }

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

  // Auditar la eliminación
  await auditDelete(
    operator.id,
    'DeliveryBatch',
    batchId,
    {
      code: batchToDelete.code,
      collaboratorId: batchToDelete.collaboratorId,
      warehouseId: batchToDelete.warehouseId,
      note: batchToDelete.note,
      itemCount: batchToDelete.deliveries.length,
    }
  );

  ["deliveries", "dashboard", "epps"].forEach((p) => revalidatePath(`/${p}`));
}
