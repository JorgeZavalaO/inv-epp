import { NextResponse } from "next/server";
import { generateWarehouseStocksExcel } from "@/lib/export/warehouse-stocks-excel";
import { requirePermission } from "@/lib/auth-utils";
import { getWarehouseScope } from "@/lib/warehouse-scope";

export const revalidate = 0;

export async function GET() {
  let scope;
  try {
    await requirePermission("warehouses_export");
    scope = await getWarehouseScope();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "No autorizado";
    return new NextResponse(JSON.stringify({ error: msg }), { status: 403 });
  }
  const buffer = await generateWarehouseStocksExcel(scope.effectiveIds);
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
