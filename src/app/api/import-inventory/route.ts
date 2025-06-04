// src/app/api/import-inventory/route.ts
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { parse } from "csv-parse/sync";

export async function POST(req: Request) {
  const csvText = await req.text();
  const rows: { code: string; warehouse: string; qty: string }[] =
    parse(csvText, { columns: true, skip_empty_lines: true });

  await prisma.$transaction(async (tx) => {
    for (const r of rows) {
      // 1) Validar EPP existente
      const epp = await tx.ePP.findUnique({
        where: { code: r.code.trim() },
        select: { id: true },
      });
      if (!epp) {
        throw new Error(`EPP no encontrado: ${r.code}`);
      }

      // 2) Validar almacén
      const wh = await tx.warehouse.findUnique({
        where: { name: r.warehouse.trim() },
        select: { id: true },
      });
      if (!wh) {
        throw new Error(`Almacén no encontrado: ${r.warehouse}`);
      }

      // 3) Validar cantidad
      const qty = Number(r.qty);
      if (Number.isNaN(qty) || qty < 0) {
        throw new Error(`Cantidad inválida: ${r.qty}`);
      }

      // 4) Insertar o actualizar EPPStock
      await tx.ePPStock.upsert({
        where: { eppId_warehouseId: { eppId: epp.id, warehouseId: wh.id } },
        create: { eppId: epp.id, warehouseId: wh.id, quantity: qty },
        update: { quantity: qty },
      });
    }
  });

  return NextResponse.json({ ok: true });
}
