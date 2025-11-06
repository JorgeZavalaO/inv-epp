"use server";

import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth-utils";

/* ───────────── Schema Zod para validaciones ───────────── */
const warehouseSchema = z.object({
  id:       z.preprocess((val) => Number(val), z.number().int().positive()).optional(),
  name:     z.string().min(2, "El nombre es requerido"),
  location: z.string().optional(),
});

export type WarehouseValues = z.infer<typeof warehouseSchema>;

/* ───────────── Crear almacén ─────────────────────────── */
export async function createWarehouseAction(fd: FormData) {
  await requirePermission("warehouses_manage");
  const raw = {
    name: fd.get("name")?.toString() ?? "",
    location: fd.get("location")?.toString() || undefined,
  };

  try {
    const data = warehouseSchema.parse(raw);
    await prisma.warehouse.create({ data });
    revalidatePath("/warehouses");
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      throw new Error(err.errors[0].message);
    }
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new Error("El nombre del almacén ya existe");
    }
    throw err;
  }
}

/* ───────────── Actualizar almacén ───────────────────────── */
export async function updateWarehouseAction(fd: FormData) {
  await requirePermission("warehouses_manage");
  const raw = {
    id: Number(fd.get("id")),
    name: fd.get("name")?.toString() ?? "",
    location: fd.get("location")?.toString() || undefined,
  };

  try {
    const parsed = z.object({
      id: z.number().int().positive("ID inválido"),
      name: z.string().min(2, "El nombre es requerido"),
      location: z.string().optional(),
    }).parse(raw);

    await prisma.warehouse.update({
      where: { id: parsed.id },
      data: { name: parsed.name, location: parsed.location },
    });
    revalidatePath("/warehouses");
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      throw new Error(err.errors[0].message);
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new Error("El nombre del almacén ya existe");
    }
    throw err;
  }
}


/* ───────────── Eliminar almacén ────────────────────────── */
export async function deleteWarehouseAction(fd: FormData) {
  await requirePermission("warehouses_manage");
  const rawId = fd.get("id");
  const id = Number(rawId);

  if (!id) {
    throw new Error("ID inválido");
  }

  // Verificar que no haya stock > 0 en ese almacén
  const nonZero = await prisma.ePPStock.count({
    where: { warehouseId: id, quantity: { gt: 0 } },
  });
  if (nonZero > 0) {
    throw new Error("El almacén tiene existencias y no puede eliminarse.");
  }

  await prisma.warehouse.delete({ where: { id } });
  revalidatePath("/warehouses");
}