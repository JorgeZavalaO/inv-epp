"use server";

import prisma from "@/lib/prisma";
import { z } from "zod";
import { collaboratorSchema } from "@/schemas/collaborator-schema";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function createCollaborator(fd: FormData) {
  const raw = {
    name:     fd.get("name")?.toString() ?? "",
    email:    fd.get("email")?.toString() ?? undefined,
    position: fd.get("position")?.toString() ?? undefined,
  };
  try {
    const data = collaboratorSchema.parse(raw);
    await prisma.collaborator.create({ data });
    revalidatePath("/collaborators");
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      throw new Error(err.errors[0].message);
    }
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new Error("Ya existe un colaborador con ese email");
    }
    throw err;
  }
}

export async function updateCollaborator(fd: FormData) {
  const raw = {
    id:       Number(fd.get("id")),
    name:     fd.get("name")?.toString() ?? "",
    email:    fd.get("email")?.toString() ?? undefined,
    position: fd.get("position")?.toString() ?? undefined,
  };
  try {
    const data = collaboratorSchema.parse(raw);
    if (!data.id) throw new Error("ID inválido");
    await prisma.collaborator.update({
      where: { id: data.id },
      data:  { name: data.name, email: data.email, position: data.position },
    });
    revalidatePath("/collaborators");
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      throw new Error(err.errors[0].message);
    }
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new Error("Ya existe un colaborador con ese email");
    }
    throw err;
  }
}

export async function deleteCollaborator(id: number) {
  // Opcional: validar que no esté en uso en entregas/solicitudes
  await prisma.collaborator.delete({ where: { id } });
  revalidatePath("/collaborators");
}
