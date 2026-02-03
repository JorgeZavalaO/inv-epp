import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
  return rb
    ? NextResponse.json(rb)
    : NextResponse.json({ error: "No encontrado" }, { status: 404 });
}
