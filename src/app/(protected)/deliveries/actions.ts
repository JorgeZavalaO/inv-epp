"use server";
import prisma from "@/lib/prisma";
import { deliveryBatchSchema } from "@/schemas/delivery-batch-schema";
import { ensureClerkUser } from "@/lib/user-sync";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";

/*----------------------------------------------------------
  1 · Crear un LOTE de entregas múltiples
----------------------------------------------------------*/
export async function createDeliveryBatch(fd: FormData) {
  const payload = JSON.parse(fd.get("payload") as string);
  const data    = deliveryBatchSchema.parse(payload);
  const user    = await ensureClerkUser();

  const batchId = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    /* Cabecera */
    const { id: batchId } = await tx.deliveryBatch.create({
      data: { employee: data.employee, note: data.note, userId: user.id },
      select: { id: true },
    });

    /* Validar stock y preparar registros */
    const rows = await Promise.all(
      data.items.map(async (it) => {
        const epp = await tx.ePP.findUnique({
          where: { id: it.eppId },
          select: { stock: true, name: true },
        });
        if (!epp || epp.stock < it.quantity) {
          throw new Error(`Stock insuficiente para «${epp?.name ?? it.eppId}»`);
        }
        return { batchId, eppId: it.eppId, quantity: it.quantity };
      })
    );

    /* Insertar renglones de una sola vez */
    await tx.delivery.createMany({ data: rows });

    /* Actualizar stock en lote */
    await Promise.all(
      rows.map((r) =>
        tx.ePP.update({
          where: { id: r.eppId },
          data: { stock: { decrement: r.quantity } },
        })
      )
    );

    return batchId;
  });

  ["/deliveries", "/epps", "/dashboard"].forEach((p) => revalidatePath(p));
  return batchId; // ← importante
}

/*----------------------------------------------------------
  2 · Deshacer un renglón (botón “Deshacer” en la tabla)
----------------------------------------------------------*/
export async function deleteDeliveryRow(id: number) {
  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const row = await tx.delivery.findUnique({
      where: { id },
      select: { eppId: true, quantity: true },
    });
    if (!row) throw new Error("Renglón no encontrado");

    /* 2.1  Borrar renglón */
    await tx.delivery.delete({ where: { id } });

    /* 2.2  Reponer stock */
    await tx.ePP.update({
      where: { id: row.eppId },
      data: { stock: { increment: row.quantity } },
    });
  });

  ["/deliveries", "/epps", "/dashboard"].forEach((p) => revalidatePath(p));
}

/*----------------------------------------------------------
  3 · (Opcional) Deshacer lote completo
     — Útil para una futura vista “detalle de batch”
----------------------------------------------------------*/
export async function deleteBatch(batchId: number) {
  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const rows = await tx.delivery.findMany({
      where: { batchId },
      select: { id: true, eppId: true, quantity: true },
    });
    if (rows.length === 0) throw new Error("Lote vacío o no existe");

    /* 3.1  Eliminar renglones */
    await tx.delivery.deleteMany({ where: { batchId } });

    /* 3.2  Eliminar cabecera  */
    await tx.deliveryBatch.delete({ where: { id: batchId } });

    /* 3.3  Devolver stock en bloque */
    for (const r of rows) {
      await tx.ePP.update({
        where: { id: r.eppId },
        data: { stock: { increment: r.quantity } },
      });
    }
  });

  ["/deliveries", "/epps", "/dashboard"].forEach((p) => revalidatePath(p));
}
