import prisma         from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * GET /api/templates/epp-import
 * Devuelve un CSV con cabecera y ejemplos (";" como separador para Excel ES-LA)
 */
export async function GET() {
  // 1) Cabeceras fijas
  const baseCols = [
    "code (opcional)",
    "name*",
    "category*",
    "description",
    "minStock*",
  ] as const;

  // 2) Una columna por almacén: stock_{id}_{nombre}
  const warehouses = await prisma.warehouse.findMany({ orderBy: { name: "asc" } });
  const warehouseCols = warehouses.map(
    (w) => `stock_${w.id}_${w.name.replace(/;/g, ",")}` // evitamos ; en cabecera
  );

  const header   = [...baseCols, ...warehouseCols].join(";");
  const example1 = ["", "Guante Nitrilo", "Protección manos", "", "2", ...warehouseCols.map(()=>"0")].join(";");
  const example2 = ["", "Casco", "Protección cabeza", "", "1", ...warehouseCols.map(()=>"0")].join(";");

  const csv = [header, example1, example2].join("\r\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type":        "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="plantilla-epps.csv"',
    },
  });
}
