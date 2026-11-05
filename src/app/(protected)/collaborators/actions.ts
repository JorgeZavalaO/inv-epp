"use server";

import prisma from "@/lib/prisma";
import { z } from "zod";
import { collaboratorSchema } from "@/schemas/collaborator-schema";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth-utils";
import { auditUpdate } from "@/lib/audit";
import {
  collaboratorStatusSchema,
  type CollaboratorStatusValue,
} from "@/schemas/collaborator-schema";

export async function createCollaborator(fd: FormData) {
  await requirePermission("collaborators_manage");
  const raw = {
    name:       fd.get("name")?.toString() ?? "",
    email:      fd.get("email")?.toString() ?? undefined,
    position:   fd.get("position")?.toString() ?? undefined,
    location:   fd.get("location")?.toString() ?? undefined,
    documentId: fd.get("documentId")?.toString() ?? undefined,
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
  await requirePermission("collaborators_manage");
  const raw = {
    id:         Number(fd.get("id")),
    name:       fd.get("name")?.toString() ?? "",
    email:      fd.get("email")?.toString() ?? undefined,
    position:   fd.get("position")?.toString() ?? undefined,
    location:   fd.get("location")?.toString() ?? undefined,
    documentId: fd.get("documentId")?.toString() ?? undefined,
  };
  try {
    const data = collaboratorSchema.parse(raw);
    if (!data.id) throw new Error("ID inválido");
    await prisma.collaborator.update({
      where: { id: data.id },
      data:  { name: data.name, email: data.email, position: data.position, location: data.location, documentId: data.documentId },
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
  await requirePermission("collaborators_manage");
  // Opcional: validar que no esté en uso en entregas/solicitudes
  await prisma.collaborator.delete({ where: { id } });
  revalidatePath("/collaborators");
}

export async function setCollaboratorStatus(
  id: number,
  status: CollaboratorStatusValue,
) {
  const operator = await requirePermission("collaborators_manage");
  const parsedStatus = collaboratorStatusSchema.parse(status);
  const parsedId = Number(id);

  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    throw new Error("ID inválido");
  }

  const before = await prisma.collaborator.findUnique({
    where: { id: parsedId },
    select: { id: true, name: true, status: true },
  });

  if (!before) {
    throw new Error("Colaborador no encontrado");
  }

  if (before.status === parsedStatus) {
    return before;
  }

  const updated = await prisma.collaborator.update({
    where: { id: parsedId },
    data: { status: parsedStatus },
    select: { id: true, name: true, status: true },
  });

  await auditUpdate(
    operator.id,
    "Collaborator",
    updated.id,
    { name: before.name, status: before.status },
    { name: updated.name, status: updated.status },
  );

  revalidatePath("/collaborators");
  revalidatePath("/deliveries");

  return updated;
}
