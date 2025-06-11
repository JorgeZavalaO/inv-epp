"use server";

import prisma from "@/lib/prisma";
import { eppSchema } from "@/schemas/epp-schema";
import { revalidatePath } from "next/cache";
import { getNextEppCode } from "@/lib/next-epp-code";

function parseFormDataToEpp(fd: FormData) {
  const entries = Array.from(fd.entries()) as [string, string][];
  const data: Record<string, unknown> = {};
  const itemsMap: Record<number, Record<string, number>> = {};

  for (const [key, value] of entries) {
    const match = key.match(/^items\.(\d+)\.(\w+)$/);
    if (match) {
      const idx = Number(match[1]);
      const field = match[2];
      itemsMap[idx] = itemsMap[idx] || {};
      itemsMap[idx][field] = Number(value);
    } else {
      data[key] = value;
    }
  }

  // Construir el array items ordenado
  data.items = Object.keys(itemsMap)
    .sort((a, b) => Number(a) - Number(b))
    .map((i) => itemsMap[Number(i)]);

  return data;
}

export async function createEpp(fd: FormData) {
  // 1) parsear y validar
  const raw = parseFormDataToEpp(fd);
  const data = eppSchema.parse(raw);

  // 2) código
  const code = data.code?.trim() || (await getNextEppCode());

  // 3) crear EPP
  const newEpp = await prisma.ePP.create({
    data: {
      code,
      name:        data.name,
      category:    data.category,
      description: data.description,
      imageUrl:    data.imageUrl,
      datasheetUrl:data.datasheetUrl,
      minStock:    data.minStock,
    },
  });

  // 4) stocks iniciales (un upsert por cada item)
  await prisma.$transaction(
    data.items.map((it) =>
      prisma.ePPStock.upsert({
        where: {
          eppId_warehouseId: {
            eppId:       newEpp.id,
            warehouseId: it.warehouseId,
          },
        },
        create: {
          eppId:       newEpp.id,
          warehouseId: it.warehouseId,
          quantity:    it.initialQty,
        },
        update: {
          quantity:    it.initialQty,
        },
      })
    )
  );

  revalidatePath("/epps");
}


export async function updateEpp(fd: FormData) {
  const raw = parseFormDataToEpp(fd);
  const data = eppSchema.parse(raw);
  const { id, items, ...rest } = data;
  if (!id) throw new Error("ID requerido");

  // 1) actualizar EPP
  await prisma.ePP.update({ where: { id }, data: rest });

  // 2) ajustar stocks
  await prisma.$transaction(async (tx) => {
    for (const it of items) {
      await tx.ePPStock.upsert({
        where: {
          eppId_warehouseId: { eppId: id, warehouseId: it.warehouseId },
        },
        create: {
          eppId:       id,
          warehouseId: it.warehouseId,
          quantity:    it.initialQty,
        },
        update: {
          quantity:    it.initialQty,
        },
      });
    }
    const keep = items.map((it) => it.warehouseId);
    await tx.ePPStock.updateMany({
      where: {
        eppId:         id,
        warehouseId: { notIn: keep },
      },
      data: { quantity: 0 },
    });
  });

  revalidatePath("/epps");
}

export async function deleteEpp(id: number) {
  const anyMovement = await prisma.stockMovement.count({ where: { eppId: id } });
  if (anyMovement > 0) {
    throw new Error("El EPP tiene movimientos y no puede eliminarse.");
  }

  await prisma.$transaction([
    prisma.ePPStock.deleteMany({ where: { eppId: id } }),
    prisma.ePP.delete({ where: { id } }),
  ]);

  revalidatePath("/epps");
  revalidatePath("/dashboard");
}
