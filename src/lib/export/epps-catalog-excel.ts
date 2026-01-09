import ExcelJS from "exceljs";

import prisma from "@/lib/prisma";

export async function generateEppsCatalogExcel() {
  const [warehouses, epps] = await Promise.all([
    prisma.warehouse.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.ePP.findMany({
      select: {
        code: true,
        name: true,
        category: true,
        subcategory: true,
        description: true,
        minStock: true,
        stocks: {
          select: {
            warehouseId: true,
            quantity: true,
          },
        },
      },
      orderBy: { code: "asc" },
    }),
  ]);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "INV-EPP";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Catálogo EPPs");

  const staticHeader = [
    "CÓDIGO",
    "NOMBRE",
    "CATEGORÍA",
    "SUBCATEGORÍA",
    "STOCK MÍNIMO",
    "TOTAL",
  ];
  const warehouseHeader = warehouses.map((w) => `STOCK - ${w.name}`);
  const header = [...staticHeader, ...warehouseHeader, "DESCRIPCIÓN"];

  worksheet.addRow(header);
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF3246E6" },
  };

  for (const e of epps) {
    const stockByWarehouse = new Map<number, number>();
    for (const s of e.stocks) stockByWarehouse.set(s.warehouseId, s.quantity);

    const total = e.stocks.reduce((sum, s) => sum + s.quantity, 0);

    const row = [
      e.code,
      e.name,
      e.category,
      e.subcategory ?? "",
      e.minStock,
      total,
      ...warehouses.map((w) => stockByWarehouse.get(w.id) ?? 0),
      e.description ?? "",
    ];
    worksheet.addRow(row);
  }

  // Ajuste de ancho de columnas
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

  // Alinear numéricos (min stock, total y stocks por almacén)
  const minStockCol = 5;
  const totalCol = 6;
  worksheet.getColumn(minStockCol).alignment = { horizontal: "center" };
  worksheet.getColumn(totalCol).alignment = { horizontal: "center" };
  for (let i = 0; i < warehouses.length; i++) {
    worksheet.getColumn(totalCol + 1 + i).alignment = { horizontal: "center" };
  }

  worksheet.views = [{ state: "frozen", ySplit: 1 }];

  return workbook.xlsx.writeBuffer();
}
