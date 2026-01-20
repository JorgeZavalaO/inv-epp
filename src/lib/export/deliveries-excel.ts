import ExcelJS from "exceljs";
import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export interface DeliveriesExportFilters {
  from?: string | Date;
  to?: string | Date;
  warehouseId?: number;
  category?: string;
  collaboratorId?: number;
  location?: string;
  search?: string;
}

function normalizeDate(input: string | Date | undefined, type: "from" | "to"): Date | undefined {
  if (!input) return undefined;
  const date = typeof input === "string" ? new Date(input) : new Date(input);
  if (Number.isNaN(date.getTime())) return undefined;
  if (type === "from") {
    date.setHours(0, 0, 0, 0);
  } else {
    date.setHours(23, 59, 59, 999);
  }
  return date;
}

export async function fetchDeliveriesForExport(filters: DeliveriesExportFilters) {
  const fromDate = normalizeDate(filters.from, "from");
  const toDate = normalizeDate(filters.to, "to");

  const batchFilters: Prisma.DeliveryBatchWhereInput = {};

  if (fromDate || toDate) {
    batchFilters.createdAt = {
      ...(fromDate ? { gte: fromDate } : {}),
      ...(toDate ? { lte: toDate } : {}),
    };
  }

  if (filters.warehouseId) {
    batchFilters.warehouseId = filters.warehouseId;
  }

  if (filters.collaboratorId) {
    batchFilters.collaboratorId = filters.collaboratorId;
  }

  if (filters.location) {
    batchFilters.collaborator = { location: filters.location };
  }

  const where: Prisma.DeliveryWhereInput = {};

  if (Object.keys(batchFilters).length) {
    where.batch = batchFilters;
  }

  if (filters.category) {
    where.epp = { category: filters.category };
  }

  const searchTerm = filters.search?.trim();
  if (searchTerm) {
    const like = { contains: searchTerm, mode: "insensitive" as const };
    where.OR = [
      { batch: { code: like } },
      { batch: { collaborator: { name: like } } },
      { epp: { name: like } },
    ];
  }

  const deliveries = await prisma.delivery.findMany({
    where,
    include: {
      batch: {
        include: {
          collaborator: {
            select: {
              name: true,
              location: true,
              documentId: true,
            },
          },
        },
      },
      epp: true,
    },
    orderBy: [
      { batch: { createdAt: "asc" } },
      { id: "asc" },
    ],
  });

  return deliveries;
}

export async function generateDeliveriesExcel(filters: DeliveriesExportFilters = {}) {
  const deliveries = await fetchDeliveriesForExport(filters);

  console.group("[Export Excel] Generación de Excel de entregas");
  console.log("Total de entregas a exportar:", deliveries.length);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "INV-EPP";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Entregas");

  const header = [
    "DNI",
    "EMPLEADO",
    "LOCALIDAD",
    "FECHA DE ENTREGA",
    "LOTE DE ENTREGA",
    "DESCRIPCION DE PRODUCTO",
    "CANTIDADES",
    "OBSERVACIONES",
  ];

  worksheet.addRow(header);
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF3246E6" } };

  const dateFormatter = new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  console.group("Detalles de cada fila:");
  deliveries.forEach((delivery, index) => {
    const collaboratorName = delivery.batch.collaborator?.name ?? "Sin asignar";
    const collaboratorLocation = delivery.batch.collaborator?.location ?? "";
    const collaboratorDocumentId = delivery.batch.collaborator?.documentId ?? "";
    const deliveryDate = delivery.batch.createdAt ?? delivery.createdAt;
    const deliveryDateStr = deliveryDate ? dateFormatter.format(deliveryDate) : "";
    const productDescription = delivery.epp.description?.trim()
      ? `${delivery.epp.name} - ${delivery.epp.description}`
      : delivery.epp.name;
    const note = delivery.batch.note ? String(delivery.batch.note).trim() : "";

    if (index < 3 || index === deliveries.length - 1) {
      console.log(`Fila ${index + 2}: DNI="${collaboratorDocumentId}", Empleado="${collaboratorName}", Lote="${delivery.batch.code}"`);
    }

    worksheet.addRow([
      collaboratorDocumentId,
      collaboratorName,
      collaboratorLocation,
      deliveryDateStr,
      delivery.batch.code,
      productDescription,
      delivery.quantity,
      note,
    ]);
  });
  console.groupEnd();

  worksheet.columns?.forEach((column) => {
    const excelColumn = column as ExcelJS.Column; // typings fix
    let max = 12;
    excelColumn.eachCell({ includeEmpty: true }, (cell) => {
      const value = cell.value;
      const length = value == null ? 0 : String(value).length;
      if (length > max) max = length;
    });
    excelColumn.width = Math.min(Math.max(max + 2, 12), 60);
  });

  worksheet.getColumn(7).alignment = { horizontal: "center" };

  console.log("Excel generado exitosamente");
  console.groupEnd();

  return workbook.xlsx.writeBuffer();
}
