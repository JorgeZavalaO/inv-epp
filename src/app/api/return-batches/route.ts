import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { returnBatchSchema } from "@/schemas/return-schema";
import { ensureClerkUser } from "@/lib/user-sync";
import { z } from "zod";

export async function GET() {
  const list = await prisma.returnBatch.findMany({
    include: { 
      warehouse: { select: { name: true } },
      user:      { select: { name: true, email: true } },
      items:     { include: { epp: { select: { code: true, name: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(list);
}

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const data    = returnBatchSchema.parse(payload);
    const user    = await ensureClerkUser();

    const batch = await prisma.$transaction(async (tx) => {
      // 1) generar código autonumérico
      const last = await tx.returnBatch.findFirst({
        where: { code: { startsWith: "RET-" } },
        orderBy: { code: "desc" },
        select: { code: true },
      });
      const num  = last ? Number(last.code.replace("RET-", "")) + 1 : 1;
      const code = `RET-${String(num).padStart(4, "0")}`;

      // 2) crear batch
      const rb = await tx.returnBatch.create({
        data: {
          code,
          warehouseId: data.warehouseId,
          userId:      user.id,
          note:        data.note,
        },
      });

      // 3) crear líneas
      for (const it of data.items.filter((i) => i.quantity > 0)) {
        await tx.returnItem.create({
          data: {
            batchId:   rb.id,
            eppId:     it.eppId,
            quantity:  it.quantity,
            condition: data.condition,
          },
        });
        // ajustar stock
        if (data.condition === "REUSABLE") {
          await tx.ePPStock.upsert({
            where: {
              eppId_warehouseId: {
                eppId:       it.eppId,
                warehouseId: it.warehouseId,
              },
            },
            update: { quantity: { increment: it.quantity } },
            create: {
              eppId:       it.eppId,
              warehouseId: it.warehouseId,
              quantity:    it.quantity,
            },
          });
        }
      }

      return rb;
    });

    return NextResponse.json(batch, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    const msg = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
