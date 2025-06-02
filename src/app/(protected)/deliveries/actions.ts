"use server";
import prisma from "@/lib/prisma";
import { deliveryBatchSchema } from "@/schemas/delivery-batch-schema";
import { ensureClerkUser } from "@/lib/user-sync";
import { revalidatePath } from "next/cache";

/*----------------------------------------------------------
  1 · Crear un LOTE de entregas múltiples
----------------------------------------------------------*/
export async function createDeliveryBatch(fd: FormData) {
  const data = deliveryBatchSchema.parse(
    JSON.parse(fd.get("payload") as string)
  );
  const user = await ensureClerkUser();

  await prisma.$transaction(async (tx) => {
    /* 1.1  Cabecera */
    const batch = await tx.deliveryBatch.create({
      data: {
        employee: data.employee,
        note: data.note,
        userId: user.id,
      },
    });

    /* 1.2  Renglones + actualización de stock */
    for (const item of data.items) {
      const epp = await tx.ePP.findUnique({
        where: { id: item.eppId },
        select: { id: true, name: true, stock: true },
      });
      if (!epp || epp.stock < item.quantity) {
        throw new Error(
          `Stock insuficiente para «${epp?.name ?? item.eppId}»`
        );
      }

      await tx.delivery.create({
        data: {
          batchId: batch.id,
          eppId: item.eppId,
          quantity: item.quantity,
        },
      });

      await tx.ePP.update({
        where: { id: item.eppId },
        data: { stock: { decrement: item.quantity } },
      });
    }
  });

  /* 1.3  Refrescar UI */
  ["/deliveries", "/epps", "/dashboard"].forEach((p) => revalidatePath(p));
}

/*----------------------------------------------------------
  2 · Deshacer un renglón (botón “Deshacer” en la tabla)
----------------------------------------------------------*/
export async function deleteDeliveryRow(id: number) {
  await prisma.$transaction(async (tx) => {
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
  await prisma.$transaction(async (tx) => {
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
