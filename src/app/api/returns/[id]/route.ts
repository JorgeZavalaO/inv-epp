import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureClerkUser } from "@/lib/user-sync";

type Params = { params: Promise<{ id: string }> };

// Obtener una devolución por su ID
export async function GET(
  _req: Request,
  { params }: Params
) {
  const { id } = await params;
  const retId = Number(id);
  if (Number.isNaN(retId)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }
  const record = await prisma.return.findUnique({
    where: { id: retId },
    include: {
      batch:     { select: { code: true } },
      epp:       { select: { code: true, name: true } },
      warehouse: { select: { name: true } },
      user:      { select: { name: true, email: true } },
    },
  });
  return record
    ? NextResponse.json(record)
    : NextResponse.json({ error: "No encontrado" }, { status: 404 });
}

// Actualizar (por ejemplo la nota) de una devolución
export async function PUT(
  req: Request,
  { params }: Params
) {
  const { id } = await params;
  const retId = Number(id);
  if (Number.isNaN(retId)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }
  const body = await req.json();
  // Validar sólo los campos que quieras permitir cambiar
  const schema = z.object({
    note: z.string().max(255).optional(),
  });
  const data = schema.parse(body) as Partial<import("@prisma/client").Return>;
  const updated = await prisma.return.update({
    where: { id: retId },
    data,
  });
  return NextResponse.json(updated);
}

// Eliminar / deshacer una devolución
export async function DELETE(
  _req: Request,
  { params }: Params
) {
  const { id } = await params;
  const retId = Number(id);
  if (Number.isNaN(retId)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }
  const user = await ensureClerkUser();
  await prisma.$transaction(async (tx) => {
    const ret = await tx.return.findUnique({ where: { id: retId } });
    if (!ret) throw new Error("Devolución no encontrada");

    await tx.return.delete({ where: { id: retId } });

    if (ret.condition === "REUSABLE") {
      // Ajustar stock
      await tx.ePPStock.update({
        where: {
          eppId_warehouseId: {
            eppId:       ret.eppId,
            warehouseId: ret.warehouseId,
          },
        },
        data: { quantity: { decrement: ret.quantity } },
      });
      // Registrar movimiento inverso
      await tx.stockMovement.create({
        data: {
          type:        "EXIT",
          eppId:       ret.eppId,
          warehouseId: ret.warehouseId,
          quantity:    ret.quantity,
          note:        `Deshacer devolución #${retId}`,
          userId:      user.id,
        },
      });
    }
  });
  return NextResponse.json({ ok: true });
}
