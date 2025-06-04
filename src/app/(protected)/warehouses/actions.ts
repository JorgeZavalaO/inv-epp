"use server";

import prisma from "@/lib/prisma";
import { z } from "zod";
import { revalidatePath } from "next/cache";

const warehouseSchema = z.object({
  name: z.string().min(2, "El nombre es requerido"),
  location: z.string().optional(),
});

export async function createWarehouse(name: string, location?: string) {
  const data = warehouseSchema.parse({ name, location });
  await prisma.warehouse.create({ data });
  revalidatePath("/warehouses");
}

export async function deleteWarehouse(id: number) {
  // Solo permitimos borrar si no hay stock en ese almacén
  const nonZero = await prisma.ePPStock.count({
    where: { warehouseId: id, quantity: { gt: 0 } },
  });
  if (nonZero > 0) {
    throw new Error("El almacén tiene existencias y no puede eliminarse.");
  }
  await prisma.warehouse.delete({ where: { id } });
  revalidatePath("/warehouses");
}
