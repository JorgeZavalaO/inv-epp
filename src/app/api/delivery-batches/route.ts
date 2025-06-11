import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { deliveryBatchSchema } from "@/schemas/delivery-batch-schema";
import { ensureClerkUser } from "@/lib/user-sync";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

export async function GET() {
  try {
    const list = await prisma.deliveryBatch.findMany({
      include: {
        collaborator: { select: { name: true, position: true, location: true } },
        user:         { select: { name: true, email: true } },
        warehouse:    { select: { name: true } },
        deliveries:   {
          include: { epp: { select: { code: true, name: true } } },
          orderBy: { id: "asc" },
        },
        _count:       { select: { deliveries: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(list);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error inesperado";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const payload  = await req.json();
    const data     = deliveryBatchSchema.parse(payload);
    const operator = await ensureClerkUser();

    const batchId = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1) Generar código
      const last = await tx.deliveryBatch.findFirst({
        where: { code: { startsWith: "DEL-" } },
        orderBy: { code: "desc" },
        select: { code: true },
      });
      const num  = last ? Number(last.code.replace("DEL-", "")) + 1 : 1;
      const code = `DEL-${String(num).padStart(4, "0")}`;

      // 2) Crear batch
      const { id } = await tx.deliveryBatch.create({
        data: {
          code,
          collaboratorId: data.collaboratorId,
          note:           data.note,
          warehouseId:    data.warehouseId,
          userId:         operator.id,
        },
        select: { id: true },
      });

      // 3) Validar stock y preparar filas
      const rows = await Promise.all(
        data.items.map(async (it) => {
          const stockRow = await tx.ePPStock.findUnique({
            where: { eppId_warehouseId: { eppId: it.eppId, warehouseId: data.warehouseId } },
            select: { quantity: true },
          });
          if (!stockRow || stockRow.quantity < it.quantity) {
            const e = await tx.ePP.findUnique({ where: { id: it.eppId }, select: { name: true } });
            throw new Error(`Stock insuficiente para «${e?.name ?? it.eppId}»`);
          }
          return { batchId: id, eppId: it.eppId, quantity: it.quantity };
        })
      );

      // 4) Crear entregas
      await tx.delivery.createMany({ data: rows });

      // 5) Ajustar stock y registrar movimientos
      for (const r of rows) {
        await tx.ePPStock.update({
          where: { eppId_warehouseId: { eppId: r.eppId, warehouseId: data.warehouseId } },
          data:  { quantity: { decrement: r.quantity } },
        });
        await tx.stockMovement.create({
          data: {
            type:        "EXIT",
            eppId:       r.eppId,
            warehouseId: data.warehouseId,
            quantity:    r.quantity,
            note:        `Entrega ${code}`,
            userId:      operator.id,
          },
        });
      }

      return id;
    });

    return NextResponse.json({ id: batchId }, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    const msg = err instanceof Error ? err.message : "Error inesperado";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
