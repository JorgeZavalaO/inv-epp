import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import {
  requirePermission,
  ensureAuthUser,
} from "@/lib/auth-utils";
import {
  assertWarehouseInScope,
  canReadWarehouse,
} from "@/lib/warehouse-scope";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const record = await prisma.delivery.findUnique({
      where: { id: Number(id) },
      include: {
        batch: {
          select: {
            id: true,
            code: true,
            warehouseId: true,
            warehouse: { select: { name: true } },
          },
        },
        epp: { select: { code: true, name: true } },
      },
    });

    if (!record) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }
    if (!(await canReadWarehouse(record.batch.warehouseId))) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }
    return NextResponse.json(record);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await requirePermission("deliveries_manage");
  const { id } = await params;

  try {
    const data = await req.json();
    const quantity = Number(data?.quantity);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return NextResponse.json(
        { error: "Cantidad inválida" },
        { status: 400 },
      );
    }

    const existing = await prisma.delivery.findUnique({
      where: { id: Number(id) },
      select: { batch: { select: { warehouseId: true } } },
    });
    if (!existing) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }
    await assertWarehouseInScope(existing.batch.warehouseId);

    const updated = await prisma.delivery.update({
      where: { id: Number(id) },
      data: { quantity },
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await requirePermission("deliveries_manage");
  const { id } = await params;

  try {
    const deliveryId = Number(id);
    const operator = await ensureAuthUser();

    // ✅ CORRECCIÓN 1: Transacción atómica para DELETE seguro
    // Leer entrega ANTES de eliminar para revertir movimiento
    const delivery = await prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: {
        batch: {
          select: {
            id: true,
            code: true,
            warehouseId: true,
          },
        },
      },
    });

    if (!delivery) {
      return NextResponse.json(
        { error: "Entrega no encontrada" },
        { status: 404 },
      );
    }

    await assertWarehouseInScope(delivery.batch.warehouseId);

    // Ejecutar transacción atómica: revertir stock + crear movimiento compensatorio + eliminar entrega
    await prisma.$transaction(async (tx) => {
      // 1. Restaurar stock (incrementar porque era una salida)
      await tx.ePPStock.update({
        where: {
          eppId_warehouseId: {
            eppId: delivery.eppId,
            warehouseId: delivery.batch.warehouseId,
          },
        },
        data: { quantity: { increment: delivery.quantity } },
      });

      // 2. Crear movimiento ENTRY compensatorio para auditoría
      const compensationTimestamp = new Date();
      await tx.stockMovement.create({
        data: {
          type: "ENTRY",
          eppId: delivery.eppId,
          warehouseId: delivery.batch.warehouseId,
          quantity: delivery.quantity,
          note: `Compensación: Eliminada entrega ${delivery.batch.code}`,
          userId: operator.id,
          status: "APPROVED",
          approvedById: operator.id,
          approvedAt: compensationTimestamp,
          createdAt: compensationTimestamp,
        },
      });

      // 3. Registrar auditoría
      await tx.auditLog.create({
        data: {
          action: "DELETE",
          entityType: "Delivery",
          entityId: deliveryId,
          userId: operator.id,
          expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          metadata: {
            reason: "Eliminación individual de entrega",
            eppId: delivery.eppId,
            quantity: delivery.quantity,
            batchCode: delivery.batch.code,
            warehouseId: delivery.batch.warehouseId,
          },
        },
      });

      // 4. Finalmente, eliminar la entrega
      await tx.delivery.delete({
        where: { id: deliveryId },
      });
    });

    return NextResponse.json({
      ok: true,
      message: "Entrega eliminada y stock restaurado correctamente",
      restored: delivery.quantity,
      warehouseId: delivery.batch.warehouseId,
    });
  } catch (error: unknown) {
    console.error("Error eliminando entrega:", error);
    const message =
      error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
