import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { deleteTransfer } from "@/app/(protected)/warehouses/transfer/actions";

/*────────── GET /api/warehouses/transfer/[id] ──────────*/
export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params; // params es Promise<{ id: string }>
  const movement = await prisma.stockMovement.findUnique({
    where: { id: Number(id) },
    include: {
      epp:       { select: { code: true, name: true } },
      warehouse: { select: { name: true } },
    },
  });

  return movement
    ? NextResponse.json(movement)
    : NextResponse.json({ error: "No encontrado" }, { status: 404 });
}

/*────────── DELETE /api/warehouses/transfer/[id] ──────────*/
export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await deleteTransfer(Number(id));
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg =
      err instanceof Error
        ? err.message
        : "Error al anular transferencia";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}