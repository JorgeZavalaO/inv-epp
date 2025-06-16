/* ──────────────────────────────────────────────────────────────
   Devuelve los DeliveryBatch con unidades todavía pendientes
   de devolución.
   (como no existe relación directa DeliveryBatch → ReturnItem
   se calcula la cantidad devuelta consultando ReturnItem cuyo
   epp y warehouse coinciden con las entregas).
   ────────────────────────────────────────────────────────────── */
import prisma          from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  /* 1) Lotes + entregas */
  const batches = await prisma.deliveryBatch.findMany({
    select: {
      id:        true,
      code:      true,
      createdAt: true,
      warehouseId:true,
      deliveries: {
        select: { eppId: true, quantity: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  /* 2) Por cada lote sumar entregado y devuelto */
  const pending = [];
  for (const b of batches) {
    const deliveredTotal = b.deliveries.reduce((s, d) => s + d.quantity, 0);

    /* total devuelto en ese almacén y esos epps */
    const returned = await prisma.returnItem.aggregate({
      _sum: { quantity: true },
      where: {
        eppId: { in: b.deliveries.map((d) => d.eppId) },
        batch: { warehouseId: b.warehouseId }, // mismo almacén
      },
    });

    const returnedTotal = returned._sum.quantity ?? 0;

    if (returnedTotal < deliveredTotal) {
      pending.push({
        id:   b.id,
        code: b.code,
        date: b.createdAt.toISOString(),
      });
    }
  }

  return NextResponse.json(pending);
}
