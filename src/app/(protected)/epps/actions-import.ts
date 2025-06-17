"use server";

import prisma             from "@/lib/prisma";
import Papa               from "papaparse";
import { z }              from "zod";
import { revalidatePath } from "next/cache";

/* ───── Helpers ───── */
const toInt = (raw: string | undefined) => {
  if (!raw) return 0;
  const cleaned = raw.replace(/[^0-9-]/g, "");
  return cleaned === "" ? 0 : Number(cleaned);
};

/* ───── Zod row schema ───── */
const eppCsvRowSchema = z.object({
  code:        z.string().optional(),
  name:        z.string().min(1),
  category:    z.string().min(1),
  description: z.string().optional(),
  minStock:    z.number().int().min(0),
  stocks:      z.record(z.number().int().min(0)),
});
type CsvRow = z.infer<typeof eppCsvRowSchema>;

/* ───── Server Action ───── */
export async function importEppsCsv(fd: FormData) {
  const file = fd.get("file") as File | null;
  if (!file) throw new Error("Archivo no encontrado");

  /* ---------- 1 · Parse CSV ---------- */
  const text = await file.text();
  const { data, errors } = Papa.parse<string[]>(text.trim(), {
    delimiter: ";",
    skipEmptyLines: true,
  });
  if (errors.length) throw new Error("CSV malformado");

  const [header, ...rows] = data as string[][];
  const fixedCols   = ["code (opcional)", "name*", "category*", "description", "minStock*"];
  const stockCols   = header.slice(fixedCols.length);
  const warehouseIds = stockCols.map((c) => Number(c.split("_")[1]));

  /* ---------- 2 · Map → objetos ---------- */
  const rawRows: CsvRow[] = rows.map((cells) => {
    const base = Object.fromEntries(
      fixedCols.map((c, i) => [
        c.split(" ")[0].replace(/[*()]/g, ""),
        cells[i] ?? "",
      ]),
    ) as unknown as Omit<CsvRow, "stocks">;

    const stocks: Record<string, number> = {};
    stockCols.forEach((_, i) => {
      stocks[String(warehouseIds[i])] = toInt(cells[fixedCols.length + i]);
    });

    return {
      ...base,
      minStock: toInt(base.minStock as unknown as string),
      stocks,
    } as CsvRow;
  });

  /* ---------- 3 · Validar y reportar fila ---------- */
  const safe = rawRows.map((row, i) => {
    try {
      return eppCsvRowSchema.parse(row);
    } catch (err) {
      throw new Error(`Fila ${i + 2}: ${(err as Error).message}`);
    }
  });

  /* ---------- 4 · Generar códigos únicos ---------- */
  // 4a) obtener último número usado (EPP-XXXX) en BD
  const last = await prisma.ePP.findFirst({
    where: { code: { startsWith: "EPP-" } },
    orderBy: { code: "desc" },
    select: { code: true },
  });
  let nextNum = last ? Number(last.code.replace("EPP-", "")) + 1 : 1;

  // 4b) conjunto para detectar duplicados en el mismo CSV
  const codesSeen = new Set<string>();

  interface RowWithCode extends CsvRow { finalCode: string }
  const ready: RowWithCode[] = safe.map((row, i) => {
    const finalCode = row.code?.trim() || `EPP-${String(nextNum++).padStart(4, "0")}`;

    if (codesSeen.has(finalCode)) {
      throw new Error(`Fila ${i + 2}: el código "${finalCode}" está duplicado en el archivo`);
    }
    codesSeen.add(finalCode);

    return { ...row, finalCode };
  });

  /* ---------- 5 · Inserción en una transacción ---------- */
  await prisma.$transaction(async (tx) => {
    for (const row of ready) {
      const epp = await tx.ePP.create({
        data: {
          code:        row.finalCode,
          name:        row.name,
          category:    row.category,
          description: row.description,
          minStock:    row.minStock,
        },
      });

      const items = Object.entries(row.stocks)
        .filter(([, qty]) => qty > 0)
        .map(([wId, qty]) => ({
          eppId:       epp.id,
          warehouseId: Number(wId),
          quantity:    qty,
        }));

      if (items.length) await tx.ePPStock.createMany({ data: items });
    }
  });

  revalidatePath("/epps");
}
