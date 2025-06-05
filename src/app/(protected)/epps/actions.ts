"use server";

import prisma from "@/lib/prisma";
import { eppSchema } from "@/schemas/epp-schema";
import { revalidatePath } from "next/cache";
import { getNextEppCode } from "@/lib/next-epp-code";

export async function createEpp(fd: FormData) {
  // 1. Parsear todos los campos (incluyendo warehouseId e initialQty)
  const data = eppSchema.parse(Object.fromEntries(fd));
  const code = data.code?.trim() || (await getNextEppCode());

  // 2. Crear el EPP
  const newEpp = await prisma.ePP.create({
    data: {
      code,
      name: data.name,
      category: data.category,
      description: data.description,
      imageUrl: data.imageUrl,
      datasheetUrl: data.datasheetUrl,
      minStock: data.minStock,
    },
  });

  // 3. Si el usuario indicó un warehouseId, crear o reemplazar registro en EPPStock
  if (data.warehouseId !== undefined) {
    await prisma.ePPStock.upsert({
      where: {
        eppId_warehouseId: {
          eppId: newEpp.id,
          warehouseId: data.warehouseId,
        },
      },
      create: {
        eppId: newEpp.id,
        warehouseId: data.warehouseId,
        quantity: data.initialQty ?? 0,
      },
      update: {
        // Reemplaza la cantidad en lugar de sumarla
        quantity: data.initialQty ?? 0,
      },
    });
  }

  // 4. Invalidar cache de lista de EPPs
  revalidatePath("/epps");
}

export async function updateEpp(fd: FormData) {
  const data = eppSchema.parse(Object.fromEntries(fd));
  const { id, warehouseId, initialQty = 0, ...rest } = data;
  if (!id) throw new Error("ID requerido");

  // ❶ actualizar los campos básicos del EPP
  await prisma.ePP.update({ where: { id }, data: rest });

  // ❷ si se indicó un almacén ⇒ transacción:
  if (warehouseId !== undefined) {
    await prisma.$transaction([
      // a) upsert en el nuevo / mismo almacén
      prisma.ePPStock.upsert({
        where: { eppId_warehouseId: { eppId: id, warehouseId } },
        create: { eppId: id, warehouseId, quantity: initialQty },
        update: { quantity: initialQty },          // reemplazar
      }),
      // b) poner a 0 TODOS los demás almacenes
      prisma.ePPStock.updateMany({
        where: {
          eppId: id,
          warehouseId: { not: warehouseId },
        },
        data: { quantity: 0 },
      }),
    ]);
  }

  revalidatePath("/epps");
}


export async function deleteEpp(id: number) {
  const anyMovement = await prisma.stockMovement.count({
    where: { eppId: id },
  });
  if (anyMovement > 0) {
    throw new Error("El EPP tiene movimientos y no puede eliminarse.");
  }

  await prisma.ePP.delete({ where: { id } });
  revalidatePath("/epps");
  revalidatePath("/dashboard");
}
