"use server";

import prisma             from "@/lib/prisma";
import { entryBatchSchema } from "@/schemas/entry-batch-schema";
import { ensureAuthUser } from "@/lib/auth-utils";
import { revalidatePath }  from "next/cache";

export async function createEntryBatch(fd: FormData) {
  /* 1) parse FormData -> objeto */
  const objRaw: Record<string, unknown> = {};
  const itemsMap: Record<number, { eppId?: number; quantity?: number }> = {};

  for (const [k, v] of fd.entries()) {
    const m = k.match(/^items\.(\d+)\.(\w+)$/);
    if (m) {
      const idx = Number(m[1]);
      itemsMap[idx] = itemsMap[idx] || {};
      const key = m[2] as keyof typeof itemsMap[number];
      itemsMap[idx][key] = Number(v);
    } else objRaw[k] = v;
  }
  objRaw.items = Object.values(itemsMap);

  /* 2) validar */
  const data = entryBatchSchema.parse(objRaw);
  const dbUser = await ensureAuthUser();

  /* 3) transacción: N movements + upsert inventario */
  await prisma.$transaction(async (tx) => {
    for (const it of data.items) {
      await tx.stockMovement.create({
        data: {
          eppId:       it.eppId,
          warehouseId: data.warehouseId,
          type:        "ENTRY",
          quantity:    it.quantity,
          note:        data.note,
          userId:      dbUser.id,
        },
      });

      await tx.ePPStock.upsert({
        where: {
          eppId_warehouseId: { eppId: it.eppId, warehouseId: data.warehouseId },
        },
        create: {
          eppId: it.eppId,
          warehouseId: data.warehouseId,
          quantity: it.quantity,
        },
        update: { quantity: { increment: it.quantity } },
      });
    }
  });

  revalidatePath("/stock-movements");
  revalidatePath("/epps");
}
