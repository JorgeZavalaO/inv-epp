"use server";

import prisma                    from "@/lib/prisma";
import { returnBatchSchema }     from "@/schemas/return-schema";
import { revalidatePath }        from "next/cache";
import { ensureAuthUser, requirePermission }        from "@/lib/auth-utils";
//import { z }                     from "zod";

/*─────────────────────────────────────────────────────
  CREA UN NUEVO LOTE de devolución (ReturnBatch)
─────────────────────────────────────────────────────*/
export async function createReturnBatch(fd: FormData) {
  await requirePermission("returns_manage");
  const raw  = JSON.parse(fd.get("payload") as string);
  const data = returnBatchSchema.parse(raw);

  const operator = await ensureAuthUser();

  await prisma.$transaction(async (tx) => {
    /* ─ 1) Generar código correlativo RB-0001 … ─ */
    const last   = await tx.returnBatch.findFirst({
      where:  { code: { startsWith: "RB-" } },
      select: { code: true },
      orderBy: { code: "desc" },
    });
    const nextNum = last ? Number(last.code.replace("RB-", "")) + 1 : 1;
    const code    = `RB-${String(nextNum).padStart(4, "0")}`;

    /* ─ 2) Crear el batch ─ */
    const { id: batchId } = await tx.returnBatch.create({
      data: {
        code,
        warehouseId: data.warehouseId,
        note:        data.note,
        userId:      operator.id,
      },
      select: { id: true },
    });

    /* ─ 3) Crear las líneas + ajustar stock ─ */
    for (const it of data.items.filter((i) => i.quantity > 0)) {
      await tx.returnItem.create({
        data: {
          batchId,
          eppId:     it.eppId,
          quantity:  it.quantity,
          condition: data.condition,
        },
      });

      if (data.condition === "REUSABLE") {
        await tx.ePPStock.upsert({
          where:  { eppId_warehouseId: { eppId: it.eppId, warehouseId: it.warehouseId } },
          update: { quantity: { increment: it.quantity } },
          create: { eppId: it.eppId, warehouseId: it.warehouseId, quantity: it.quantity },
        });

        await tx.stockMovement.create({
          data: {
            type:        "ENTRY",
            eppId:       it.eppId,
            warehouseId: it.warehouseId,
            quantity:    it.quantity,
            note:        `Devolución ${code}`,
            userId:      operator.id,
          },
        });
      }
    }
  });

  revalidatePath("/returns");
  revalidatePath("/epps");
  revalidatePath("/dashboard");
}

/*─────────────────────────────────────────────────────
  DESHACE / ELIMINA un lote de devolución completo
─────────────────────────────────────────────────────*/
export async function deleteReturnBatch(batchId: number) {
  await requirePermission("returns_manage");
  const batch = await prisma.returnBatch.findUnique({
    where:  { id: batchId },
    select: { id: true, code: true, items: true, warehouseId: true, userId: true },
  });
  if (!batch) throw new Error("Lote no encontrado");

  await prisma.$transaction(async (tx) => {
    /* Revertir stock SOLO si era reutilizable */
    for (const it of batch.items) {
      if (it.condition === "REUSABLE") {
        await tx.ePPStock.update({
          where:  { eppId_warehouseId: { eppId: it.eppId, warehouseId: batch.warehouseId } },
          data:   { quantity: { decrement: it.quantity } },
        });

        await tx.stockMovement.create({
          data: {
            type:        "EXIT",
            eppId:       it.eppId,
            warehouseId: batch.warehouseId,
            quantity:    it.quantity,
            note:        `Deshacer devolución ${batch.code}`,
            userId:      batch.userId,
          },
        });
      }
    }

    /* Borramos líneas + cabecera */
    await tx.returnItem.deleteMany({ where: { batchId } });
    await tx.returnBatch.delete({ where: { id: batchId } });
  });

  revalidatePath("/returns");
  revalidatePath("/epps");
  revalidatePath("/dashboard");
}
