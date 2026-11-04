import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth-utils";
import { canReadWarehouse } from "@/lib/warehouse-scope";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission("returns_manage");
  } catch (err) {
    const msg = err instanceof Error ? err.message : "No autorizado";
    return NextResponse.json({ error: msg }, { status: 403 });
  }

  const { id } = await params;
  const batchId = Number(id);
  if (Number.isNaN(batchId)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }
  const rb = await prisma.returnBatch.findUnique({
    where: { id: batchId },
    include: {
      items: { include: { epp: { select: { code: true, name: true } } } },
      cancelledDeliveryBatch: { select: { code: true } },
    },
  });

  if (!rb || !(await canReadWarehouse(rb.warehouseId))) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  return NextResponse.json(rb);
}
