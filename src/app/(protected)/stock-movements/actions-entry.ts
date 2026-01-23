"use server";

import prisma             from "@/lib/prisma";
import { entryBatchSchema } from "@/schemas/entry-batch-schema";
import { ensureAuthUser } from "@/lib/auth-utils";
import { revalidatePath }  from "next/cache";
import { UserRole, MovementStatus } from "@prisma/client";

export async function createEntryBatch(fd: FormData) {
  /* 1) parse FormData -> objeto */
  const objRaw: Record<string, unknown> = {};
  const itemsMap: Record<number, { eppId?: number; quantity?: number; unitPrice?: number }> = {};

  for (const [k, v] of fd.entries()) {
    const m = k.match(/^items\.(\d+)\.(\w+)$/);
    if (m) {
      const idx = Number(m[1]);
      itemsMap[idx] = itemsMap[idx] || {};
      const key = m[2] as keyof typeof itemsMap[number];
      if (key === 'unitPrice') {
        itemsMap[idx][key] = v ? Number(v) : undefined;
      } else {
        itemsMap[idx][key] = Number(v);
      }
    } else objRaw[k] = v;
  }
  objRaw.items = Object.values(itemsMap);

  /* 2) validar */
  const data = entryBatchSchema.parse(objRaw);
  const dbUser = await ensureAuthUser();

  // Determinar si requiere aprobación
  const requiresApproval = dbUser.role !== UserRole.ADMIN;

  /* 3) Si requiere aprobación, solo crear los movimientos sin actualizar stock */
  if (requiresApproval) {
    await prisma.$transaction(async (tx) => {
      for (const it of data.items) {
        await tx.stockMovement.create({
          data: {
            eppId:       it.eppId,
            warehouseId: data.warehouseId,
            type:        "ENTRY",
            quantity:    it.quantity,
            unitPrice:   it.unitPrice,
            note:        data.note,
            purchaseOrder: data.purchaseOrder,
            userId:      dbUser.id,
            status:      MovementStatus.PENDING,
          },
        });
      }
    });

    revalidatePath("/stock-movements");
    
    return {
      success: true,
      requiresApproval: true,
      message: `Entrada múltiple creada con ${data.items.length} items. Pendiente de aprobación por un administrador.`,
    };
  }

  /* 4) Si es ADMIN, crear movimientos y actualizar stock inmediatamente */
  await prisma.$transaction(async (tx) => {
    // ✅ CORRECCIÓN 3: Timestamp consistente para toda la entrada por lote
    const entryTimestamp = new Date();
    
    for (const it of data.items) {
      await tx.stockMovement.create({
        data: {
          eppId:       it.eppId,
          warehouseId: data.warehouseId,
          type:        "ENTRY",
          quantity:    it.quantity,
          unitPrice:   it.unitPrice,
          note:        data.note,
          purchaseOrder: data.purchaseOrder,
          userId:      dbUser.id,
          status:      MovementStatus.APPROVED,
          approvedById: dbUser.id,
          approvedAt: entryTimestamp,
          createdAt: entryTimestamp, // ✅ Timestamp consistente
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
  
  return {
    success: true,
    requiresApproval: false,
    message: `Entrada múltiple de ${data.items.length} items creada y aplicada exitosamente.`,
  };
}
