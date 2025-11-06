import { NextResponse } from "next/server";
import { generateWarehouseStocksExcel } from "@/lib/export/warehouse-stocks-excel";
import { requirePermission } from "@/lib/auth-utils";

export const revalidate = 0;

export async function GET() {
  try {
    await requirePermission("warehouses_export");
  } catch (err) {
    const msg = err instanceof Error ? err.message : "No autorizado";
    return new NextResponse(JSON.stringify({ error: msg }), { status: 403 });
  }
  const buffer = await generateWarehouseStocksExcel();
  const now = new Date();
  const filename = `stocks-por-almacen-${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}.xlsx`;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename=${filename}`,
      "Cache-Control": "no-store",
    },
  });
}
