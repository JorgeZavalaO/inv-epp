"use server";

import prisma from "@/lib/prisma";
import { eppSchema } from "@/schemas/epp-schema";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";

/* ---- Crear ---- */
export async function createEpp(fd: FormData) {
  try {
    const data = eppSchema.parse(Object.fromEntries(fd));
    await prisma.ePP.create({ data });
    revalidatePath("/epps");
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new Error("El código ya existe"); // unique constraint
    }
    throw err;
  }
}

/* ---- Actualizar ---- */
export async function updateEpp(formData: FormData) {
  const data = eppSchema.parse(Object.fromEntries(formData));
  const { id, ...rest } = data;
  if (!id) throw new Error("ID requerido");
  await prisma.ePP.update({ where: { id }, data: rest });
  revalidatePath("/epps");
}

/* ---- Eliminar ---- */
export async function deleteEpp(id: number) {
  const hasMov = await prisma.stockMovement.count({ where: { eppId: id } });
  if (hasMov) throw new Error("El EPP tiene movimientos y no puede eliminarse.");

  await prisma.ePP.delete({ where: { id } });
  revalidatePath("/epps");
}

