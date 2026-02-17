import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * GET /api/suspicious-returns?warehouseId=14&eppIds=66,29,95,20,33
 * 
 * Investiga qué devoluciones se han registrado para un almacén y lista de EPPs,
 * mostrando quién las creó, cuándo y cuánto se devolvió de cada una.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const warehouseId = Number(searchParams.get("warehouseId"));
  const eppIdsStr = searchParams.get("eppIds");

  if (Number.isNaN(warehouseId) || !eppIdsStr) {
    return NextResponse.json(
      { error: "Requiere: warehouseId (number) y eppIds (comma-separated)" },
      { status: 400 }
    );
  }

  const eppIds = eppIdsStr.split(",").map((e) => Number(e));

  try {
    // Obtener TODAS las ReturnBatch que contienen items de estos EPPs
    const returns = await prisma.returnBatch.findMany({
      where: {
        warehouseId: warehouseId,
        items: {
          some: {
            eppId: {
              in: eppIds,
            },
          },
        },
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        items: {
          where: {
            eppId: {
              in: eppIds,
            },
          },
          include: {
            epp: {
              select: { code: true, name: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const result = returns.map((rb) => ({
      returnBatchId: rb.id,
      returnCode: rb.code,
      warehouseId: rb.warehouseId,
      createdAt: rb.createdAt,
      createdBy: rb.user
        ? { id: rb.user.id, name: rb.user.name, email: rb.user.email }
        : null,
      note: rb.note,
      totalQuantityReturned: rb.items.reduce((s, i) => s + i.quantity, 0),
      items: rb.items.map((i) => ({
        eppId: i.eppId,
        eppCode: i.epp?.code || "N/A",
        eppName: i.epp?.name || "N/A",
        quantity: i.quantity,
        condition: i.condition,
      })),
    }));

    return NextResponse.json({
      warehouseId,
      eppIds,
      totalReturns: result.length,
      returns: result,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
