import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { collaboratorSchema } from "@/schemas/collaborator-schema";
import { Prisma } from "@prisma/client";

export async function GET() {
  const list = await prisma.collaborator.findMany({
    select: {
      id: true,
      name: true,
      position: true,
      location: true,
    },
    orderBy: { name: "asc" },
  });
  
  return NextResponse.json(list, {
    headers: {
      // ✅ OPTIMIZACIÓN: Cache de 10 minutos para colaboradores
      "Cache-Control": "public, max-age=600, s-maxage=600, stale-while-revalidate=300",
    },
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = collaboratorSchema.parse(body);
    const created = await prisma.collaborator.create({ data });
    return NextResponse.json(created, { status: 201 });
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
