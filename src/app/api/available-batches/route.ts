import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// Devuelve los DeliveryBatch con unidades todavía pendientes de devolución.
export async function GET() {
  // 1) Lotes + entregas
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

  console.log(`[available-batches] Encontrados ${batches.length} lotes totales`);

  if (batches.length === 0) {
    return NextResponse.json([]);
  }

  // 2) Obtener SOLO devoluciones vinculadas a una entrega específica
  //    CRÍTICO: filtramos por cancelledDeliveryBatchId para no mezclar devoluciones
  //    de entregas diferentes del mismo almacén
  const returns = await prisma.$queryRaw<
    Array<{ batchId: number; eppId: number; qty: number }>
  >`
    SELECT rb."cancelledDeliveryBatchId" AS "batchId",
           ri."eppId"                    AS "eppId",
           SUM(ri.quantity)::int         AS qty
    FROM "ReturnBatch" rb
    JOIN "ReturnItem" ri ON rb.id = ri."batchId"
    WHERE rb."cancelledDeliveryBatchId" IS NOT NULL
    GROUP BY rb."cancelledDeliveryBatchId", ri."eppId"
  `;

  // Mapear por (batchId, eppId) - SOLO devoluciones vinculadas a ESA entrega
  const retMap = new Map<string, number>();
  for (const r of returns) {
    const key = `${r.batchId}:${r.eppId}`;
    retMap.set(key, r.qty);
  }

  console.log(
    `[available-batches] Devoluciones vinculadas encontradas: ${retMap.size} pares (batchId, eppId)`
  );

  // 3) Calcular pendientes
  const pending = batches
    .filter((b) => {
      console.log(`\n[DEBUG] Batch ID=${b.id}, Code=${b.code}:`);
      console.log(`  - warehouseId=${b.warehouseId}`);
      console.log(`  - deliveries.length=${b.deliveries.length}`);

      if (b.deliveries.length === 0) {
        console.log(`  → EXCLUIDO: Sin entregas`);
        return false;
      }

      const deliveredTotal = b.deliveries.reduce((s, d) => s + d.quantity, 0);
      let returnedTotal = 0;
      const breakdown: string[] = [];

      for (const d of b.deliveries) {
        const key = `${b.id}:${d.eppId}`; // Usa batchId, no warehouseId
        const returned = retMap.get(key) ?? 0;
        returnedTotal += returned;
        breakdown.push(`eppId:${d.eppId} (entregado:${d.quantity}, devuelto:${returned})`);
      }

      console.log(`  - deliveredTotal=${deliveredTotal}`);
      console.log(`  - returnedTotal=${returnedTotal}`);
      console.log(`  - items: ${breakdown.join(", ")}`);

      const shouldInclude = returnedTotal < deliveredTotal;
      console.log(`  → ${shouldInclude ? "INCLUIDO" : "EXCLUIDO"}: ${returnedTotal} < ${deliveredTotal} = ${shouldInclude}`);

      return shouldInclude;
    })
    .map((b) => ({ id: b.id, code: b.code, date: b.createdAt.toISOString() }));

  console.log(`\n[available-batches] Total disponibles: ${pending.length}`);
  console.log(`[available-batches] IDs disponibles: ${pending.map((p) => p.id).join(", ")}`);
  return NextResponse.json(pending);
}

