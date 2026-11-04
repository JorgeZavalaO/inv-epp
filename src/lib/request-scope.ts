import type { Prisma } from "@prisma/client";
import { isInScope, type WarehouseScope } from "@/lib/warehouse-scope";

/**
 * Requests without a warehouse are legacy rows: only unrestricted users in the
 * ALL view can see them. Never infer their warehouse from the creator.
 */
export function legacyRequestsVisible(scope: WarehouseScope): boolean {
  return scope.allowedIds === null && scope.effectiveIds === null;
}

export function requestWarehouseWhere(
  scope: WarehouseScope,
): Prisma.RequestWhereInput {
  if (scope.effectiveIds === null) return {};
  return { warehouseId: { in: scope.effectiveIds } };
}

export function canReadRequest(
  scope: WarehouseScope,
  warehouseId: number | null,
): boolean {
  if (warehouseId === null) return legacyRequestsVisible(scope);
  return isInScope(scope, warehouseId);
}
