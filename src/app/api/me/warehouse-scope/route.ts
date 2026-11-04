import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getWarehouseScope } from "@/lib/warehouse-scope";

const NO_STORE = { "Cache-Control": "private, no-store" };

/**
 * GET /api/me/warehouse-scope
 * Personal warehouse scope used by client components to render selectors,
 * preselect the primary warehouse and warn when it is not configured.
 */
export async function GET() {
  let scope;
  try {
    scope = await getWarehouseScope();
  } catch {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const visibleIds = scope.effectiveIds;
  const allowedIds = scope.allowedIds;

  const [visible, allowed, primary] = await Promise.all([
    visibleIds === null
      ? prisma.warehouse.findMany({
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : prisma.warehouse.findMany({
          where: { id: { in: visibleIds } },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        }),
    allowedIds === null
      ? prisma.warehouse.findMany({
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : prisma.warehouse.findMany({
          where: { id: { in: allowedIds } },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        }),
    scope.primaryWarehouseId === null
      ? Promise.resolve(null)
      : prisma.warehouse.findUnique({
          where: { id: scope.primaryWarehouseId },
          select: { id: true, name: true },
        }),
  ]);

  return NextResponse.json(
    {
      viewMode: scope.viewMode,
      primaryWarehouse: primary,
      effectiveWarehouses: visible,
      allowedWarehouses: allowed,
      needsPrimary: scope.needsPrimary,
    },
    { headers: NO_STORE },
  );
}
