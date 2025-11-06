import prisma                     from "@/lib/prisma";
import { NextResponse }           from "next/server";
import { ensureAuthUser, requirePermission }         from "@/lib/auth-utils";
import { z }                      from "zod";
import type { Prisma }            from "@prisma/client";

/*────────── GET /api/delivery-batches/[id] ──────────*/
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;             // 👈 se espera la promise
  const batchId = Number(id);
  if (Number.isNaN(batchId)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  try {
    const record = await prisma.deliveryBatch.findUnique({
      where: { id: batchId },
      include: {
        collaborator: { select: { name: true, position: true, location: true } },
        user:         { select: { name: true, email: true } },
        warehouse:    { select: { name: true } },
        deliveries:   {
          include: { epp: { select: { code: true, name: true } } },
          orderBy: { id: "asc" },
        },
      },
    });
    return record
      ? NextResponse.json(record)
      : NextResponse.json({ error: "No encontrado" }, { status: 404 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error inesperado";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/*────────── PUT /api/delivery-batches/[id] ──────────*/
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission("deliveries_manage");
  } catch (err) {
    const msg = err instanceof Error ? err.message : "No autorizado";
    return NextResponse.json({ error: msg }, { status: 403 });
  }
  const { id } = await params;
  const batchId = Number(id);
  if (Number.isNaN(batchId)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  try {
    const raw = await req.json();
    const editSchema = z.object({
      collaboratorId: z.number().int().positive(),
      note:           z.string().max(255).optional(),
    });
    const data = editSchema.parse(raw);

    const updated = await prisma.deliveryBatch.update({
      where: { id: batchId },
      data:  { collaboratorId: data.collaboratorId, note: data.note },
    });
    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    const msg = err instanceof Error ? err.message : "Error inesperado";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/*────────── DELETE /api/delivery-batches/[id] ──────────*/
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission("deliveries_manage");
  } catch (err) {
    const msg = err instanceof Error ? err.message : "No autorizado";
    return NextResponse.json({ error: msg }, { status: 403 });
  }
  const { id } = await params;
  const batchId = Number(id);
  if (Number.isNaN(batchId)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  try {
    const operator = await ensureAuthUser();

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const rows = await tx.delivery.findMany({
        where:  { batchId },
        select: { eppId: true, quantity: true, batch: { select: { warehouseId: true } } },
      });
      if (rows.length === 0) throw new Error("Lote vacío o no existe");

      for (const r of rows) {
        await tx.ePPStock.update({
          where: { eppId_warehouseId: { eppId: r.eppId, warehouseId: r.batch.warehouseId } },
          data:  { quantity: { increment: r.quantity } },
        });
        await tx.stockMovement.create({
          data: {
            type:        "ENTRY",
            eppId:       r.eppId,
            warehouseId: r.batch.warehouseId,
            quantity:    r.quantity,
            note:        `Deshacer lote ${batchId}`,
            userId:      operator.id,
          },
        });
      }

      await tx.delivery.deleteMany({ where: { batchId } });
      await tx.deliveryBatch.delete({ where: { id: batchId } });
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error inesperado";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
