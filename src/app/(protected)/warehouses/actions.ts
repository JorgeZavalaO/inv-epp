"use server";

import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { revalidatePath } from "next/cache";

/* ───────────────────  Validación  ─────────────────── */
const warehouseSchema = z.object({
  name:     z.string().min(2, "El nombre es requerido"), // mínimo 2 caracteres
  location: z.string().optional(),
});

/* ───────────────────  Acción de formulario  ───────────────────
 *  Esta función se pasa directamente a <form action={…}>          */
export async function createWarehouseAction(fd: FormData) {
  const name     = fd.get("name")?.toString() ?? "";
  const location = fd.get("location")?.toString() || undefined;

  try {
    await createWarehouse({ name, location });
    revalidatePath("/warehouses");
  } catch (err: unknown) {
    /* Si ocurre un ZodError, lo lanzamos con su mensaje para que NextJS lo muestre al usuario.
       Si es un error de Prisma P2002, lanzamos el texto adecuado. */
    if (err instanceof z.ZodError) {
      // Devolver el primer mensaje de validación
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

/* ───────────────────  Lógica reutilizable  ─────────────────── */
export async function createWarehouse({
  name,
  location,
}: {
  name: string;
  location?: string;
}) {
  // 1 · Validación con Zod (si falla, lanza ZodError)
  const data = warehouseSchema.parse({ name, location });

  // 2 · Escritura en BD con control de error P2002
  try {
    await prisma.warehouse.create({ data });
  } catch (err: unknown) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      /* Se violó la clave única `name`        */
      throw new Error("El nombre del almacén ya existe");
    }
    throw err; /* Propaga cualquier otro error               */
  }
}

/* ───────────────────  Borrar almacén  ─────────────────── */
export async function deleteWarehouse(id: number) {
  // No permitir si aún existe stock en ese almacén
  const nonZero = await prisma.ePPStock.count({
    where: { warehouseId: id, quantity: { gt: 0 } },
  });
  if (nonZero > 0) {
    throw new Error("El almacén tiene existencias y no puede eliminarse.");
  }
  await prisma.warehouse.delete({ where: { id } });
  revalidatePath("/warehouses");
}
