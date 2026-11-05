import { NextRequest, NextResponse } from "next/server";
import { generateDeliveriesExcel } from "@/lib/export/deliveries-excel";
import { requirePermission } from "@/lib/auth-utils";
import { getWarehouseScope, narrowScope } from "@/lib/warehouse-scope";
import { limaDateKey, parseLimaDateBoundary } from "@/lib/date-range";

function parseNumber(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function parseDate(value: string | null, boundary: "start" | "end"): Date | undefined {
  return parseLimaDateBoundary(value, boundary) ?? undefined;
}

export async function GET(req: NextRequest) {
  try {
    await requirePermission("deliveries_export");
  } catch (err) {
    const msg = err instanceof Error ? err.message : "No autorizado";
    return new NextResponse(JSON.stringify({ error: msg }), { status: 403 });
  }
  const { searchParams } = new URL(req.url);

  const scope = await getWarehouseScope();
  const requestedWarehouseId = parseNumber(searchParams.get("warehouseId"));
  const warehouseIds =
    requestedWarehouseId !== undefined
      ? narrowScope(scope, requestedWarehouseId)
      : scope.effectiveIds;

  const from = parseDate(searchParams.get("dateFrom") ?? searchParams.get("from"), "start");
  const to = parseDate(searchParams.get("dateTo") ?? searchParams.get("to"), "end");

  const buffer = await generateDeliveriesExcel({
    from,
    to,
    warehouseIds,
    collaboratorId: parseNumber(searchParams.get("collaboratorId")),
    category: searchParams.get("category") ?? undefined,
    location: searchParams.get("location") ?? undefined,
    search: searchParams.get("search") ?? undefined,
  });

  let filenameSuffix = "general";
  if (from && to) {
    filenameSuffix = `${limaDateKey(from)}_al_${limaDateKey(to)}`;
  } else if (from) {
    filenameSuffix = `desde_${limaDateKey(from)}`;
  } else if (to) {
    filenameSuffix = `hasta_${limaDateKey(to)}`;
  } else {
    filenameSuffix = limaDateKey(new Date());
  }

  const filename = `entregas-${filenameSuffix}.xlsx`;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename=${filename}`,
      "Cache-Control": "no-store",
    },
  });
}
