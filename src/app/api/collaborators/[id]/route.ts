import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { collaboratorSchema } from "@/schemas/collaborator-schema";
import { Prisma } from "@prisma/client";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const record = await prisma.collaborator.findUnique({
    where: { id: Number(params.id) },
  });
  return record
    ? NextResponse.json(record)
    : NextResponse.json({ error: "No encontrado" }, { status: 404 });
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const parsed = collaboratorSchema
      .pick({ name: true, email: true, position: true })
      .parse(body);
    const updated = await prisma.collaborator.update({
      where: { id: Number(params.id) },
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

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  await prisma.collaborator.delete({ where: { id: Number(params.id) } });
  return NextResponse.json({ ok: true });
}
