import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth-utils";
import ExcelJS from "exceljs";

export async function GET() {
  try {
    await requirePermission("stock_movements_manage");
  } catch (err) {
    const msg = err instanceof Error ? err.message : "No autorizado";
    return NextResponse.json({ error: msg }, { status: 403 });
  }

  // Obtener todos los movimientos con relaciones
  const movements = await prisma.stockMovement.findMany({
    include: {
      epp: { select: { code: true, name: true } },
      user: { select: { email: true } },
      warehouse: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 10000, // Límite prudencial
  });

  // Crear workbook
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Movimientos");

  // Configurar columnas
  worksheet.columns = [
    { header: "ID", key: "id", width: 8 },
    { header: "Fecha", key: "date", width: 18 },
    { header: "Código EPP", key: "eppCode", width: 12 },
    { header: "Nombre EPP", key: "eppName", width: 25 },
    { header: "Tipo", key: "type", width: 12 },
    { header: "Cantidad", key: "quantity", width: 10 },
    { header: "Almacén", key: "warehouse", width: 18 },
    { header: "Operador", key: "operator", width: 18 },
    { header: "Orden Compra", key: "purchaseOrder", width: 15 },
    { header: "Precio Unitario", key: "unitPrice", width: 15 },
    { header: "Nota", key: "note", width: 30 },
  ];

  // Estilizar encabezado
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "366092" },
  };
  headerRow.alignment = { horizontal: "center", vertical: "middle" };

  // Agregar datos
  movements.forEach((mv) => {
    const typeMap: Record<string, string> = {
      ENTRY: "Entrada",
      EXIT: "Salida",
      ADJUSTMENT: "Ajuste",
    };

    worksheet.addRow({
      id: mv.id,
      date: new Date(mv.createdAt).toLocaleDateString("es-ES", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }),
      eppCode: mv.epp.code,
      eppName: mv.epp.name,
      type: typeMap[mv.type] || mv.type,
      quantity: mv.quantity,
      warehouse: mv.warehouse.name,
      operator: mv.user.email,
      purchaseOrder: mv.purchaseOrder || "",
      unitPrice: mv.unitPrice ? `$${Number(mv.unitPrice).toFixed(2)}` : "",
      note: mv.note || "",
    });
  });

  // Ajustar ancho automático para algunas columnas
  worksheet.columns.forEach((col) => {
    if (col.key === "note") {
      col.width = 40;
    }
    if (col.key === "eppName") {
      col.width = 30;
    }
  });

  // Generar buffer
  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="movimientos-stock-${new Date().toISOString().split("T")[0]}.xlsx"`,
    },
  });
}
