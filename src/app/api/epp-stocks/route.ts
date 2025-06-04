import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * GET /api/epp-stocks?eppId=123&warehouseId=456
 * Devuelve { quantity: number } de la existencia del EPP en un almacén dado.
 * Si no existe registro, retorna { quantity: 0 }.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const eppId = Number(searchParams.get("eppId"));
  const warehouseId = Number(searchParams.get("warehouseId"));

  if (!eppId || !warehouseId) {
    return NextResponse.json({ error: "Parámetros eppId y warehouseId son obligatorios" }, { status: 400 });
  }

  const record = await prisma.ePPStock.findUnique({
    where: { eppId_warehouseId: { eppId, warehouseId } },
    select: { quantity: true },
  });

  return NextResponse.json(record ?? { quantity: 0 });
}
