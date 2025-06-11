import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/epp-stocks?eppId=123&warehouseId=456
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const eppId = Number(searchParams.get("eppId"));
    const warehouseId = Number(searchParams.get("warehouseId"));

    if (!eppId || !warehouseId) {
      return NextResponse.json(
        { error: "Parámetros eppId y warehouseId son obligatorios" },
        { status: 400 }
      );
    }

    // buscamos el stock; si no existe devolvemos quantity:0
    const record = await prisma.ePPStock.findUnique({
      where: { eppId_warehouseId: { eppId, warehouseId } },
      select: { quantity: true },
    });

    return NextResponse.json({ quantity: record?.quantity ?? 0 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error inesperado";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
