import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-utils";
import { calculateExpirationDate } from "@/lib/audit/config";

interface FixRequest {
  type: string;
  action: string; // "DELETE_MOVEMENT" | "UPDATE_DELIVERY" | "CREATE_MOVEMENT"
  deliveryId?: number;
  movementIds?: number[];
  newQuantity?: number;
  eppId?: number;
  batchId?: number;
}

export async function POST(req: Request) {
  try {
    const user = await requirePermission("stock_movements_manage");

    const body: FixRequest = await req.json();
    const { action, deliveryId, movementIds, newQuantity, eppId, batchId } = body;

    if (action === "DELETE_MOVEMENT" && movementIds && movementIds.length > 0) {
      // Revertir stock antes de eliminar
      for (const movementId of movementIds) {
        const movement = await prisma.stockMovement.findUnique({
          where: { id: movementId }
        });

        if (movement) {
          // Revertir el stock
          await prisma.ePPStock.update({
            where: {
              eppId_warehouseId: {
                eppId: movement.eppId,
                warehouseId: movement.warehouseId
              }
            },
            data: {
              quantity: {
                increment: movement.type === "EXIT" ? movement.quantity : -movement.quantity
              }
            }
          });

          // Registrar en auditoría
          await prisma.auditLog.create({
            data: {
              action: "DELETE",
              entityType: "STOCK_MOVEMENT",
              entityId: movementId,
              changes: {
                reason: "Manual fix - consistency audit",
                movement: movement
              },
              expiresAt: calculateExpirationDate("StockMovement"),
              userId: user.id
            }
          });
        }
      }

      // Eliminar movimientos
      await prisma.stockMovement.deleteMany({
        where: { id: { in: movementIds } }
      });

      return NextResponse.json({
        success: true,
        message: `${movementIds.length} movimiento(s) eliminado(s) y stock revertido`
      });
    }

    if (action === "UPDATE_DELIVERY" && deliveryId && newQuantity !== undefined) {
      const delivery = await prisma.delivery.findUnique({
        where: { id: deliveryId },
        include: { batch: true }
      });

      if (!delivery) {
        return NextResponse.json({ error: "Entrega no encontrada" }, { status: 404 });
      }

      const oldQuantity = delivery.quantity;
      const delta = newQuantity - oldQuantity;

      // Actualizar la entrega
      await prisma.delivery.update({
        where: { id: deliveryId },
        data: { quantity: newQuantity }
      });

      // Ajustar stock por el delta
      if (delta !== 0) {
        await prisma.ePPStock.update({
          where: {
            eppId_warehouseId: {
              eppId: delivery.eppId,
              warehouseId: delivery.batch.warehouseId
            }
          },
          data: {
            quantity: {
              decrement: delta
            }
          }
        });

        // Crear movimiento de ajuste
        await prisma.stockMovement.create({
          data: {
            type: "EXIT",
            eppId: delivery.eppId,
            warehouseId: delivery.batch.warehouseId,
            quantity: Math.abs(delta),
            note: `Ajuste manual - Entrega ${delivery.batch.code} (${oldQuantity} → ${newQuantity})`,
            userId: user.id
          }
        });
      }

      // Registrar en auditoría
      await prisma.auditLog.create({
        data: {
          action: "UPDATE",
          entityType: "DELIVERY",
          entityId: deliveryId,
          changes: {
            oldQuantity,
            newQuantity,
            delta,
            reason: "Manual fix - consistency audit"
          },
          expiresAt: calculateExpirationDate("Delivery"),
          userId: user.id
        }
      });

      return NextResponse.json({
        success: true,
        message: `Entrega actualizada de ${oldQuantity} a ${newQuantity} unidades`
      });
    }

    if (action === "CREATE_MOVEMENT" && eppId && batchId && newQuantity) {
      const batch = await prisma.deliveryBatch.findUnique({
        where: { id: batchId },
        select: { warehouseId: true, code: true }
      });

      if (!batch) {
        return NextResponse.json({ error: "Lote no encontrado" }, { status: 404 });
      }

      // Descontar stock
      await prisma.ePPStock.update({
        where: {
          eppId_warehouseId: {
            eppId,
            warehouseId: batch.warehouseId
          }
        },
        data: {
          quantity: { decrement: newQuantity }
        }
      });

      // Crear movimiento
      const movement = await prisma.stockMovement.create({
        data: {
          type: "EXIT",
          eppId,
          warehouseId: batch.warehouseId,
          quantity: newQuantity,
          note: `Entrega ${batch.code} (movimiento creado manualmente)`,
          userId: user.id
        }
      });

      // Registrar en auditoría
      await prisma.auditLog.create({
        data: {
          action: "CREATE",
          entityType: "STOCK_MOVEMENT",
          entityId: movement.id,
          changes: {
            quantity: newQuantity,
            reason: "Manual fix - consistency audit"
          },
          expiresAt: calculateExpirationDate("StockMovement"),
          userId: user.id
        }
      });

      return NextResponse.json({
        success: true,
        message: `Movimiento creado: ${newQuantity} unidades`,
        movement
      });
    }

    return NextResponse.json(
      { error: "Acción no soportada" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error al corregir:", error);
    const msg = error instanceof Error ? error.message : "Error al corregir";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
