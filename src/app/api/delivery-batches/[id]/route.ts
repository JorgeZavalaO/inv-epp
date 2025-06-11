import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
//import { deliveryBatchSchema } from "@/schemas/delivery-batch-schema";
import { ensureClerkUser }      from "@/lib/user-sync";
import { z }                    from "zod";
import type { Prisma }          from "@prisma/client";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const record = await prisma.deliveryBatch.findUnique({
      where: { id: Number(params.id) },
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
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error inesperado";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const raw = await req.json();
    const editSchema = z.object({
      collaboratorId: z.number().int().positive(),
      note:           z.string().max(255).optional(),
    });
    const data = editSchema.parse(raw);
    const updated = await prisma.deliveryBatch.update({
      where: { id: Number(params.id) },
      data:  { collaboratorId: data.collaboratorId, note: data.note },
    });
    return NextResponse.json(updated);
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    const msg = err instanceof Error ? err.message : "Error inesperado";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    const batchId  = Number(params.id);
    const operator = await ensureClerkUser();

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const rows = await tx.delivery.findMany({
        where: { batchId },
        select: {
          eppId:   true,
          quantity:true,
          batch:   { select: { warehouseId: true } },
        },
      });
      if (rows.length === 0) throw new Error("Lote vacío o no existe");

      for (const r of rows) {
        await tx.ePPStock.update({
          where: {
            eppId_warehouseId: {
              eppId:       r.eppId,
              warehouseId: r.batch.warehouseId,
            },
          },
          data: { quantity: { increment: r.quantity } },
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
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error inesperado";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
