"use server";

import prisma                from "@/lib/prisma";
import { returnBatchSchema } from "@/schemas/return-schema";
import { revalidatePath }    from "next/cache";
import { ensureClerkUser }   from "@/lib/user-sync";

export async function createReturnBatch(fd: FormData) {
  const raw  = JSON.parse(fd.get("payload") as string);
  const data = returnBatchSchema.parse(raw);

  const user = await ensureClerkUser();

  await prisma.$transaction(async (tx) => {
    for (const it of data.items.filter((i) => i.quantity > 0)) {
      await tx.return.create({
        data: {
          batchId:      data.batchId,
          eppId:        it.eppId,
          warehouseId:  it.warehouseId,
          quantity:     it.quantity,
          employee:     "-",
          condition:    "REUSABLE",
          userId:       user.id,
        },
      });

      // Ajustar stock
      await tx.ePPStock.upsert({
        where: {
          eppId_warehouseId: {
            eppId:       it.eppId,
            warehouseId: it.warehouseId,
          },
        },
        update: { quantity: { increment: it.quantity } },
        create: {
          eppId:       it.eppId,
          warehouseId: it.warehouseId,
          quantity:    it.quantity,
        },
      });
    }
  });

  revalidatePath("/returns");
  revalidatePath("/epps");
  revalidatePath("/dashboard");
}



export async function deleteReturn(id: number) {
  const ret = await prisma.return.findUnique({ where: { id } });
  if (!ret) throw new Error("Devolución no encontrada");

  await prisma.$transaction(async (tx) => {
    await tx.return.delete({ where: { id } });
    if (ret.condition === "REUSABLE") {
      await tx.ePPStock.update({
        where: {
          eppId_warehouseId: {
            eppId:       ret.eppId,
            warehouseId: ret.warehouseId,
          },
        },
        data: { quantity: { decrement: ret.quantity } },
      });
      // opcional: registro el movimiento de salida de stock al deshacer
      await tx.stockMovement.create({
        data: {
          type:        "EXIT",
          eppId:       ret.eppId,
          warehouseId: ret.warehouseId,
          quantity:    ret.quantity,
          note:        `Deshacer devolución ${id}`,
          userId:      ret.userId,
        },
      });
    }
  });

  revalidatePath("/returns");
  revalidatePath("/epps");
  revalidatePath("/dashboard");
}
