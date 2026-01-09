import { NextResponse } from "next/server";

import { requirePermission } from "@/lib/auth-utils";
import { generateEppsCatalogExcel } from "@/lib/export/epps-catalog-excel";

export const revalidate = 0;

export async function GET() {
  try {
    await requirePermission("epps_manage");
  } catch (err) {
    const msg = err instanceof Error ? err.message : "No autorizado";
    return new NextResponse(JSON.stringify({ error: msg }), { status: 403 });
  }

  const buffer = await generateEppsCatalogExcel();
  const now = new Date();
  const filename = `catalogo-epps-${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}.xlsx`;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename=${filename}`,
      "Cache-Control": "no-store",
    },
  });
}
