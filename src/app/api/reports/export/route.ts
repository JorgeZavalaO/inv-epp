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

function parseDate(value: string | null, boundary: "start" | "end", fallback: Date): Date {
  return parseLimaDateBoundary(value, boundary) ?? fallback;
}

export async function GET(req: NextRequest) {
  await requirePermission("reports_export");
  
  const { searchParams } = new URL(req.url);

  const yearParam = Number(searchParams.get("year") ?? new Date().getFullYear());
  const year = Number.isFinite(yearParam) ? Math.trunc(yearParam) : new Date().getFullYear();

  const defaultFrom = parseLimaDateBoundary(`${year}-01-01`, "start") ?? new Date(year, 0, 1);
  const defaultTo =
    parseLimaDateBoundary(`${year}-12-31`, "end") ?? new Date(year, 11, 31, 23, 59, 59, 999);

  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  const fromDate = parseDate(fromParam, "start", defaultFrom);
  const toDate = parseDate(toParam, "end", defaultTo);

  const warehouseId = parseNumber(searchParams.get("warehouseId"));
  const scope = await getWarehouseScope();
  const warehouseIds = narrowScope(scope, warehouseId);
  const collaboratorId = parseNumber(searchParams.get("collaboratorId"));
  const category = searchParams.get("category") ?? undefined;
  const location = searchParams.get("location") ?? undefined;
  const search = searchParams.get("search") ?? undefined;

  const buffer = await generateDeliveriesExcel({
    from: fromDate,
    to: toDate,
    warehouseId,
    warehouseIds,
    collaboratorId,
    category,
    location,
    search,
  });

  const rangeLabel =
    fromParam || toParam
      ? `${limaDateKey(fromDate)}_al_${limaDateKey(toDate)}`
      : `${year}`;
  const filename = `reportes-entregas-${rangeLabel}.xlsx`;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename=${filename}`,
      "Cache-Control": "no-store",
    },
  });
}
