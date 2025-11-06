import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { collaboratorSchema } from "@/schemas/collaborator-schema";
import { Prisma } from "@prisma/client";
import { requirePermission } from "@/lib/auth-utils";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const record = await prisma.collaborator.findUnique({
    where: { id: Number(id) },
  });
  
  return record
    ? NextResponse.json(record)
    : NextResponse.json({ error: "No encontrado" }, { status: 404 });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  try {
    await requirePermission("collaborators_manage");
    const body = await req.json();
    const parsed = collaboratorSchema
      .pick({ name: true, email: true, position: true })
      .parse(body);
    
    const updated = await prisma.collaborator.update({
      where: { id: Number(id) },
      data: parsed,
    });
    
    return NextResponse.json(updated);
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.errors[0].message },
        { status: 400 }
      );
    }
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Ya existe un colaborador con ese email" },
        { status: 400 }
      );
    }
    const msg = err instanceof Error ? err.message : "Error inesperado";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  await requirePermission("collaborators_manage");
  await prisma.collaborator.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}