import { NextRequest, NextResponse } from "next/server";
import { generateDeliveriesExcel } from "@/lib/export/deliveries-excel";

function parseNumber(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function parseDate(value: string | null, fallback: Date): Date {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

function formatForFilename(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const year = Number(searchParams.get("year") ?? new Date().getFullYear());

  const defaultFrom = new Date(year, 0, 1);
  const defaultTo = new Date(year, 11, 31);

  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  const fromDate = parseDate(fromParam, defaultFrom);
  const toDate = parseDate(toParam, defaultTo);

  const warehouseId = parseNumber(searchParams.get("warehouseId"));
  const collaboratorId = parseNumber(searchParams.get("collaboratorId"));
  const category = searchParams.get("category") ?? undefined;
  const location = searchParams.get("location") ?? undefined;
  const search = searchParams.get("search") ?? undefined;

  const buffer = await generateDeliveriesExcel({
    from: fromDate,
    to: toDate,
    warehouseId,
    collaboratorId,
    category,
    location,
    search,
  });

  const rangeLabel =
    fromParam || toParam
      ? `${formatForFilename(fromDate)}_al_${formatForFilename(toDate)}`
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
