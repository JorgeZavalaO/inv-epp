import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// Devuelve los DeliveryBatch con unidades todavía pendientes de devolución.
// Optimizado para evitar N+1 agregaciones usando una pre-agrupación
// de devoluciones por (warehouseId, eppId).
export async function GET() {
  // 1) Lotes + entregas (una sola consulta)
  const batches = await prisma.deliveryBatch.findMany({
    select: {
      id: true,
      code: true,
      createdAt: true,
      warehouseId: true,
      deliveries: { select: { eppId: true, quantity: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  if (batches.length === 0) {
    return NextResponse.json([]);
  }

  // 2) Pre-agregar devoluciones por (warehouseId, eppId)
  const returns = await prisma.$queryRaw<Array<{ warehouseId: number; eppId: number; qty: number }>>`
    SELECT rb."warehouseId" AS "warehouseId",
           ri."eppId"       AS "eppId",
           SUM(ri.quantity)::int AS qty
    FROM "ReturnItem" ri
    INNER JOIN "ReturnBatch" rb ON rb.id = ri."batchId"
    GROUP BY rb."warehouseId", ri."eppId"
  `;

  const retMap = new Map<string, number>();
  for (const r of returns) {
    retMap.set(`${r.warehouseId}:${r.eppId}`, r.qty);
  }

  // 3) Calcular pendientes comparando totales por lote
  const pending = batches
    .filter((b) => {
      if (b.deliveries.length === 0) return false;
      const deliveredTotal = b.deliveries.reduce((s, d) => s + d.quantity, 0);
      const returnedTotal = b.deliveries.reduce(
        (s, d) => s + (retMap.get(`${b.warehouseId}:${d.eppId}`) ?? 0),
        0
      );
      return returnedTotal < deliveredTotal;
    })
    .map((b) => ({ id: b.id, code: b.code, date: b.createdAt.toISOString() }));

  return NextResponse.json(pending);
}

