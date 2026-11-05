import { Prisma } from "@prisma/client";

import prisma from "@/lib/prisma";
import { sqlWarehouseIn } from "@/lib/warehouse-scope";

/**
 * Latest approved purchase unit price per EPP.
 *
 * Only ENTRY movements with a unit price are considered, so entries without a
 * price never hide the last known price. Returns a map keyed by EPP id.
 */
export async function getLastPurchasePrices(
  eppIds: number[],
  warehouseIds: number[] | null,
): Promise<Map<number, number>> {
  if (eppIds.length === 0) return new Map();

  const warehouseFilter = sqlWarehouseIn(
    Prisma.raw('"warehouseId"'),
    warehouseIds,
  );
  const rows = await prisma.$queryRaw<
    Array<{ eppId: number; unitPrice: Prisma.Decimal }>
  >(Prisma.sql`
    SELECT DISTINCT ON ("eppId") "eppId", "unitPrice"
    FROM "StockMovement"
    WHERE "eppId" IN (${Prisma.join(eppIds)})
      AND "type" = 'ENTRY'
      AND "status" = 'APPROVED'
      AND "unitPrice" IS NOT NULL
      AND ${warehouseFilter}
    ORDER BY "eppId" ASC, "createdAt" DESC, "id" DESC
  `);

  const prices = new Map<number, number>();
  for (const row of rows) {
    prices.set(row.eppId, Number(row.unitPrice));
  }
  return prices;
}
