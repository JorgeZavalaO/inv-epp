// src/app/api/import-inventory/route.ts
import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-utils";
import { NextResponse } from "next/server";
import { parse } from "csv-parse/sync";

export async function POST(req: Request) {
  try {
    await requirePermission("epps_manage");
    const csvText = await req.text();
    const rows: { code: string; warehouse: string; qty: string }[] =
      parse(csvText, { columns: true, skip_empty_lines: true });

    if (rows.length === 0) {
      return NextResponse.json({ error: "No hay datos para importar" }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      // 1) Pre-validar todos los EPPs en una sola consulta
      const eppCodes = [...new Set(rows.map(r => r.code.trim()))];
      const epps = await tx.ePP.findMany({
        where: { code: { in: eppCodes } },
        select: { id: true, code: true },
      });
      const eppMap = new Map(epps.map(e => [e.code, e.id]));

      // 2) Pre-validar todos los almacenes en una sola consulta
      const warehouseNames = [...new Set(rows.map(r => r.warehouse.trim()))];
      const warehouses = await tx.warehouse.findMany({
        where: { name: { in: warehouseNames } },
        select: { id: true, name: true },
      });
      const warehouseMap = new Map(warehouses.map(w => [w.name, w.id]));

      // 3) Validar y preparar datos
      const validData: Array<{ eppId: number; warehouseId: number; quantity: number }> = [];
      const errors: string[] = [];

      for (const [index, r] of rows.entries()) {
        const rowNum = index + 1;
        const code = r.code.trim();
        const warehouseName = r.warehouse.trim();
        
        // Validar EPP
        const eppId = eppMap.get(code);
        if (!eppId) {
          errors.push(`Fila ${rowNum}: EPP no encontrado: ${code}`);
          continue;
        }

        // Validar almacén
        const warehouseId = warehouseMap.get(warehouseName);
        if (!warehouseId) {
          errors.push(`Fila ${rowNum}: Almacén no encontrado: ${warehouseName}`);
          continue;
        }

        // Validar cantidad
        const qty = Number(r.qty);
        if (Number.isNaN(qty) || qty < 0) {
          errors.push(`Fila ${rowNum}: Cantidad inválida: ${r.qty}`);
          continue;
        }

        validData.push({ eppId, warehouseId, quantity: qty });
      }

      if (errors.length > 0) {
        throw new Error(`Errores de validación:\n${errors.join('\n')}`);
      }

      // 4) Agrupar por (eppId, warehouseId) para optimizar upserts
      const groupedData = validData.reduce((acc, item) => {
        const key = `${item.eppId}-${item.warehouseId}`;
        if (!acc[key]) {
          acc[key] = { ...item, quantity: 0 };
        }
        acc[key].quantity += item.quantity; // Sumar cantidades si hay duplicados
        return acc;
      }, {} as Record<string, { eppId: number; warehouseId: number; quantity: number }>);

      // 5) Ejecutar upserts en lotes para mejor performance
      const upsertData = Object.values(groupedData);
      const BATCH_SIZE = 50;
      
      for (let i = 0; i < upsertData.length; i += BATCH_SIZE) {
        const batch = upsertData.slice(i, i + BATCH_SIZE);
        await Promise.all(
          batch.map(item =>
            tx.ePPStock.upsert({
              where: { 
                eppId_warehouseId: { 
                  eppId: item.eppId, 
                  warehouseId: item.warehouseId 
                } 
              },
              create: item,
              update: { quantity: item.quantity },
            })
          )
        );
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: `${rows.length} registros procesados correctamente` 
    });
  } catch (error: unknown) {
    console.error("Error importing inventory:", error);
    const message = error instanceof Error ? error.message : "Error inesperado";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
