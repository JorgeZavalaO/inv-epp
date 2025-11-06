import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth-utils";
import { z } from "zod";
import { Prisma } from "@prisma/client";

/* El esquema de validación para PUT (mismo que en POST) */
const warehouseSchema = z.object({
  name:     z.string().min(2, "El nombre es requerido"),
  location: z.string().optional(),
});

/*────────── GET /api/warehouses/[id] ──────────*/
export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params; // ⚠️ ahora params es Promise<{ id }>
  const wh = await prisma.warehouse.findUnique({ where: { id: Number(id) } });
  return wh
    ? NextResponse.json(wh)
    : NextResponse.json({ error: "No encontrado" }, { status: 404 });
}

/*────────── PUT /api/warehouses/[id] ──────────*/
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission("warehouses_manage");
    const { id } = await params;
    const body = await req.json();
    const data = warehouseSchema.parse(body);

    const updated = await prisma.warehouse.update({
      where: { id: Number(id) },
      data,
    });
    return NextResponse.json(updated);
  } catch (err: unknown) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "El nombre del almacén ya existe" },
        { status: 400 }
      );
    }
    if (err instanceof z.ZodError) {
      const messages = err.errors.map((e) => e.message).join(", ");
      return NextResponse.json({ error: messages }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Error al actualizar";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/*────────── DELETE /api/warehouses/[id] ──────────*/
export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission("warehouses_manage");
  } catch (err) {
    const msg = err instanceof Error ? err.message : "No autorizado";
    return NextResponse.json({ error: msg }, { status: 403 });
  }
  const { id } = await params;
  const warehouseId = Number(id);

  // 1) Validar que no haya stock en ese almacén
  const nonZero = await prisma.ePPStock.count({
    where: { warehouseId, quantity: { gt: 0 } },
  });
  if (nonZero > 0) {
    return NextResponse.json(
      { error: "El almacén tiene existencias y no puede eliminarse." },
      { status: 400 }
    );
  }

  // 2) Eliminar
  await prisma.warehouse.delete({ where: { id: warehouseId } });
  return NextResponse.json({ ok: true });
}