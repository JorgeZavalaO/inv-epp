import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { buildDeliveryBatchPdf } from "@/lib/pdf/delivery-batch";
import { requirePermission } from "@/lib/auth-utils";
import { canReadWarehouse } from "@/lib/warehouse-scope";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requirePermission("deliveries_manage");
  } catch (err) {
    const msg = err instanceof Error ? err.message : "No autorizado";
    return NextResponse.json({ error: msg }, { status: 403 });
  }

  const { id } = await params;
  const batch = await prisma.deliveryBatch.findUnique({
    where: { id: Number(id) },
    include: {
      collaborator: { select: { name: true, position: true, location: true } },
      user:         { select: { name: true, email: true } },
      warehouse:    { select: { name: true } },
      deliveries:   {
        include: { epp: { select: { code: true, name: true } } },
        orderBy: { id: "asc" },
      },
    },
  });

  if (!batch || !(await canReadWarehouse(batch.warehouseId)))
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const pdfBytes = await buildDeliveryBatchPdf(batch as NonNullable<typeof batch>);

  const sanitize = (s: string) =>
    s
      .replace(/\s+/g, " ")
      .replace(/[\\/:*?"<>|]+/g, "")
      .trim();

  const collaboratorName = batch.collaborator?.name ? sanitize(batch.collaborator.name) : "colaborador";
  const filename = `${sanitize(batch.code)} - ${collaboratorName}.pdf`;

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type":        "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control":       "no-store",
    },
  });
}
