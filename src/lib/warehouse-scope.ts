import { cache } from "react";
import { Prisma, UserRole, WarehouseViewMode } from "@prisma/client";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

/**
 * Roles subject to warehouse assignment. Any other role has access to every warehouse.
 */
export const WAREHOUSE_RESTRICTED_ROLES: UserRole[] = [
  "SUPERVISOR",
  "WAREHOUSE_MANAGER",
];

export interface WarehouseScope {
  userId: string;
  /** Warehouses the user is authorized to access. null = no restriction. */
  allowedIds: number[] | null;
  /** Primary warehouse if set, existing, and included in allowedIds. */
  primaryWarehouseId: number | null;
  viewMode: WarehouseViewMode;
  /** Active filter. null = no filter, [] = no results. */
  effectiveIds: number[] | null;
  /** Stable discriminator for cache keys, e.g. "all" or "w:1,3". */
  cacheKey: string;
  /** True when the user picked PRIMARY but has no valid primary warehouse. */
  needsPrimary: boolean;
}

function scopedError(message: string, statusCode: number): Error {
  const error = new Error(message);
  (error as Error & { statusCode: number }).statusCode = statusCode;
  return error;
}

export function warehouseScopeErrorStatus(error: unknown): number | null {
  if (!(error instanceof Error)) return null;
  const statusCode = (error as Error & { statusCode?: number }).statusCode;
  return typeof statusCode === "number" ? statusCode : null;
}

/**
 * Resolve the current user's warehouse scope. Memoized per request render.
 * Throws a 401 error when there is no authenticated user.
 */
export const getWarehouseScope = cache(async (): Promise<WarehouseScope> => {
  const session = await auth();
  const userId = session?.user?.id;
  const role = session?.user?.role as UserRole | undefined;

  if (!userId || !role) {
    throw scopedError("No autenticado", 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      primaryWarehouseId: true,
      warehouseViewMode: true,
      warehouseAssignments: { select: { warehouseId: true } },
    },
  });

  if (!user) {
    throw scopedError("No autenticado", 401);
  }

  const currentRole = user.role as UserRole;
  const allowedIds = WAREHOUSE_RESTRICTED_ROLES.includes(currentRole)
    ? user.warehouseAssignments.map((assignment) => assignment.warehouseId)
    : null;

  const primaryIsAllowed =
    user.primaryWarehouseId !== null &&
    (allowedIds === null || allowedIds.includes(user.primaryWarehouseId));

  const primaryWarehouseId = primaryIsAllowed ? user.primaryWarehouseId : null;
  const viewMode = user.warehouseViewMode;

  let effectiveIds: number[] | null = allowedIds;
  if (viewMode === WarehouseViewMode.PRIMARY && primaryWarehouseId !== null) {
    effectiveIds = [primaryWarehouseId];
  }

  const sortedIds = effectiveIds === null ? null : [...effectiveIds].sort((a, b) => a - b);
  const cacheKey = sortedIds === null ? "all" : `w:${sortedIds.join(",")}`;

  return {
    userId: user.id,
    allowedIds,
    primaryWarehouseId,
    viewMode,
    effectiveIds,
    cacheKey,
    needsPrimary: viewMode === WarehouseViewMode.PRIMARY && primaryWarehouseId === null,
  };
});

/**
 * Intersect an optional requested warehouse with the effective scope.
 * A request for an out-of-scope warehouse returns [] (never widens access).
 */
export function narrowScope(
  scope: WarehouseScope,
  requestedId?: number | null,
): number[] | null {
  if (requestedId === undefined || requestedId === null || Number.isNaN(requestedId)) {
    return scope.effectiveIds;
  }
  if (scope.effectiveIds === null) return [requestedId];
  return scope.effectiveIds.includes(requestedId) ? [requestedId] : [];
}

/**
 * Prisma helper: undefined means "do not filter".
 */
export function warehouseIdFilter(ids: number[] | null): Prisma.IntFilter | undefined {
  return ids === null ? undefined : { in: ids };
}

/**
 * Raw SQL helper. `column` must be a constant built with Prisma.raw, never user input.
 */
export function sqlWarehouseIn(column: Prisma.Sql, ids: number[] | null): Prisma.Sql {
  if (ids === null) return Prisma.sql`TRUE`;
  if (ids.length === 0) return Prisma.sql`FALSE`;
  return Prisma.sql`${column} IN (${Prisma.join(ids)})`;
}

export function isInScope(scope: WarehouseScope, warehouseId: number): boolean {
  return scope.effectiveIds === null || scope.effectiveIds.includes(warehouseId);
}

/**
 * Write guard: throws 403 when the warehouse is outside the active scope.
 */
export async function assertWarehouseInScope(warehouseId: number): Promise<void> {
  const scope = await getWarehouseScope();
  if (!isInScope(scope, warehouseId)) {
    throw scopedError("No autorizado - Almacén fuera de tu alcance actual", 403);
  }
}

/**
 * Read guard for by-id resources: callers should answer 404 when this returns false.
 */
export async function canReadWarehouse(warehouseId: number): Promise<boolean> {
  const scope = await getWarehouseScope();
  return isInScope(scope, warehouseId);
}

/**
 * Transfers always originate from the user's primary warehouse.
 */
export async function requirePrimaryWarehouse(): Promise<number> {
  const scope = await getWarehouseScope();
  if (scope.primaryWarehouseId === null) {
    throw scopedError(
      "Configura tu almacén principal para realizar traslados",
      400,
    );
  }
  return scope.primaryWarehouseId;
}
