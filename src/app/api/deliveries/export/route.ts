import { NextRequest, NextResponse } from "next/server";
import { generateDeliveriesExcel } from "@/lib/export/deliveries-excel";

function parseNumber(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function parseDate(value: string | null): Date | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function formatForFilename(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const from = parseDate(searchParams.get("dateFrom") ?? searchParams.get("from"));
  const to = parseDate(searchParams.get("dateTo") ?? searchParams.get("to"));

  const buffer = await generateDeliveriesExcel({
    from,
    to,
    warehouseId: parseNumber(searchParams.get("warehouseId")),
    collaboratorId: parseNumber(searchParams.get("collaboratorId")),
    category: searchParams.get("category") ?? undefined,
    location: searchParams.get("location") ?? undefined,
    search: searchParams.get("search") ?? undefined,
  });

  let filenameSuffix = "general";
  if (from && to) {
    filenameSuffix = `${formatForFilename(from)}_al_${formatForFilename(to)}`;
  } else if (from) {
    filenameSuffix = `desde_${formatForFilename(from)}`;
  } else if (to) {
    filenameSuffix = `hasta_${formatForFilename(to)}`;
  } else {
    const now = new Date();
    filenameSuffix = formatForFilename(now);
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
