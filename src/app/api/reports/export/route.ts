import { NextRequest, NextResponse } from "next/server";
import { fetchReportsData } from "@/lib/reports";
import ExcelJS from "exceljs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const year = Number(searchParams.get("year") ?? new Date().getFullYear());
  const warehouseId = searchParams.get("warehouseId") ? Number(searchParams.get("warehouseId")) : undefined;
  const category = searchParams.get("category") ?? undefined;
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;

  const data = await fetchReportsData(year, { warehouseId, category, from, to });

  const wb = new ExcelJS.Workbook();
  wb.creator = "EPP Manager";
  const ws1 = wb.addWorksheet("Mensual");
  ws1.addRow(["Mes", "Cantidad"]);
  data.monthly.forEach(m => ws1.addRow([m.month, m.qty]));

  const ws2 = wb.addWorksheet("Top EPPs");
  ws2.addRow(["EPP", "Cantidad"]);
  data.topEpps.forEach(t => ws2.addRow([t.name, t.qty]));

  const ws3 = wb.addWorksheet("Sedes");
  ws3.addRow(["Sede/Depto", "Cantidad"]);
  data.topLocations.forEach(l => ws3.addRow([l.location, l.qty]));

  const ws4 = wb.addWorksheet("Ultimas Entregas");
  ws4.addRow(["Fecha", "Lote", "EPP", "Cantidad", "Colaborador", "Almacén"]);
  data.latest.forEach(r => ws4.addRow([r.date, r.batchCode, r.eppName, r.qty, r.collaborator ?? "", r.warehouse]));

  const buffer = await wb.xlsx.writeBuffer();
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename=reportes-${year}.xlsx`,
      "Cache-Control": "no-store",
    },
  });
}
