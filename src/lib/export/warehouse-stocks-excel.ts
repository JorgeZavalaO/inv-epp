import ExcelJS from "exceljs";
import prisma from "@/lib/prisma";

export async function generateWarehouseStocksExcel() {
  // Traer todos los stocks con su EPP y Almacén
  const stocks = await prisma.ePPStock.findMany({
    include: {
      epp: { select: { code: true, name: true, description: true } },
      warehouse: { select: { name: true } },
    },
    orderBy: [
      { warehouse: { name: "asc" } },
      { epp: { code: "asc" } },
    ],
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "INV-EPP";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Stocks por almacén");

  const header = [
    "ALMACÉN",
    "CÓDIGO",
    "PRODUCTO",
    "STOCK",
  ];
  worksheet.addRow(header);
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF3246E6" } };

  for (const s of stocks) {
    const product = s.epp.description?.trim()
      ? `${s.epp.name} - ${s.epp.description}`
      : s.epp.name;

    worksheet.addRow([
      s.warehouse.name,
      s.epp.code,
      product,
      s.quantity,
    ]);
  }

  worksheet.columns?.forEach((column) => {
    const excelColumn = column as ExcelJS.Column;
    let max = 12;
    excelColumn.eachCell({ includeEmpty: true }, (cell) => {
      const value = cell.value;
      const length = value == null ? 0 : String(value).length;
      if (length > max) max = length;
    });
    excelColumn.width = Math.min(Math.max(max + 2, 12), 60);
  });

  // Alinear stock
  worksheet.getColumn(4).alignment = { horizontal: "center" };

  return workbook.xlsx.writeBuffer();
}
