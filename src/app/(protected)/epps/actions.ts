"use server";

import prisma from "@/lib/prisma";
import { eppSchema } from "@/schemas/epp-schema";
import { revalidatePath } from "next/cache";

/* ---- Crear ---- */
export async function createEpp(formData: FormData) {
  const data = eppSchema.parse(Object.fromEntries(formData));
  await prisma.ePP.create({ data });
  revalidatePath("/epps");
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
  await prisma.ePP.delete({ where: { id } });
  revalidatePath("/epps");
}
