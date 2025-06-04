import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";

/*────────── Schema de validación con Zod ──────────*/
const warehouseSchema = z.object({
  name:     z.string().min(2, "El nombre es requerido"),
  location: z.string().optional(),
});

/*────────── GET /api/warehouses ──────────*/
export async function GET() {
  const list = await prisma.warehouse.findMany({
    select: { id: true, name: true, location: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(list);
}

/*────────── POST /api/warehouses ──────────*/
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = warehouseSchema.parse(body);

    const created = await prisma.warehouse.create({ data });
    return NextResponse.json(created, { status: 201 });
  } catch (err: unknown) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      // Violación de restricción única en `name`
      return NextResponse.json(
        { error: "El nombre del almacén ya existe" },
        { status: 400 }
      );  
    }
    if (err instanceof z.ZodError) {
      // Errores de validación
      const messages = err.errors.map((e) => e.message).join(", ");
      return NextResponse.json({ error: messages }, { status: 400 });
    }
    // Otros errores
    const message = err instanceof Error ? err.message : "Error inesperado";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
