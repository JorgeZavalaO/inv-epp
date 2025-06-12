import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { returnBatchSchema } from "@/schemas/return-schema";
import { ensureClerkUser } from "@/lib/user-sync";

export async function GET() {
  // List all returns, con información del lote, EPP y usuario
  const list = await prisma.return.findMany({
    include: {
      batch:     { select: { code: true } },
      epp:       { select: { code: true, name: true } },
      warehouse: { select: { name: true } },
      user:      { select: { name: true, email: true } },
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

    // En transacción creamos cada línea de devolución y ajustamos stock
    const created = await prisma.$transaction(async (tx) => {
      const results = [];
      for (const item of data.items) {
        const ret = await tx.return.create({
          data: {
            batchId:     data.batchId,
            eppId:       item.eppId,
            warehouseId: item.warehouseId,
            quantity:    item.quantity,
            employee:    "-",          // aquí podrías inyectar un campo 'employee' en el schema
            condition:   "REUSABLE",   // o agregarlo al payload y al schema si necesitas
            
            userId:      user.id,
          },
        });
        results.push(ret);

        // Ajuste de stock
        await tx.ePPStock.upsert({
          where: {
            eppId_warehouseId: {
              eppId:       item.eppId,
              warehouseId: item.warehouseId,
            },
          },
          update: { quantity: { increment: item.quantity } },
          create: {
            eppId:       item.eppId,
            warehouseId: item.warehouseId,
            quantity:    item.quantity,
          },
        });
      }
      return results;
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.errors[0].message },
        { status: 400 }
      );
    }
    const msg = err instanceof Error ? err.message : "Error inesperado";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
