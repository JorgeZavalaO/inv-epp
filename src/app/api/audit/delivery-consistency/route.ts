import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-utils";

interface Issue {
  type: string;
  severity: string;
  deliveryId?: number;
  movementId?: number;
  movementIds?: number[];
  batchCode: string;
  eppCode: string;
  eppName: string;
  eppId?: number;
  batchId?: number;
  deliveryQty?: number;
  movementQty?: number;
  details?: string;
  createdAt?: Date;
  difference?: number;
  quantity?: number;
  warehouseId?: number;
  warehouse?: string;
  createdBy?: string;
  status?: string;
  cause?: string;
  impact?: string;
  daysSinceCreation?: number;
  movements?: Array<{
    id: number;
    quantity: number;
    createdAt: Date;
    status: string;
    userId: string;
  }>;
}

export async function GET() {
  try {
    await requirePermission("stock_movements_manage");

    const deliveries = await prisma.delivery.findMany({
      include: {
        batch: {
          select: { code: true, warehouseId: true, createdAt: true, id: true }
        },
        epp: { select: { code: true, name: true, id: true } }
      }
    });

    const movements = await prisma.stockMovement.findMany({
      where: { type: "EXIT" },
      include: {
        epp: { select: { code: true, name: true } },
        warehouse: { select: { name: true, id: true } },
        user: { select: { name: true, email: true } }
      }
    });

    // Encontrar discrepancias
    const issues: Issue[] = [];

    for (const delivery of deliveries) {
      const relatedMovements = movements.filter(m =>
        m.eppId === delivery.eppId &&
        m.warehouseId === delivery.batch.warehouseId &&
        m.note?.includes(delivery.batch.code)
      );

      if (relatedMovements.length === 0) {
        // Entrega sin movimiento
        const cause = "La entrega se registró pero no se generó el movimiento de stock correspondiente. Posiblemente por error en la creación o problema técnico durante la transacción.";
        
        issues.push({
          type: "MISSING_MOVEMENT",
          severity: "CRITICAL",
          deliveryId: delivery.id,
          batchCode: delivery.batch.code,
          batchId: delivery.batch.id,
          eppCode: delivery.epp.code,
          eppName: delivery.epp.name,
          eppId: delivery.epp.id,
          deliveryQty: delivery.quantity,
          movementQty: 0,
          movementIds: [],
          createdAt: delivery.createdAt,
          cause,
          impact: "El stock no se ha descontado, generando discrepancia de inventario"
        });
      } else {
        const totalMovementQty = relatedMovements.reduce((sum, m) => sum + m.quantity, 0);

        if (totalMovementQty !== delivery.quantity) {
          const hasMultipleMovements = relatedMovements.length > 1;
          const timeDiff = relatedMovements.length > 1 
            ? Math.floor((new Date(relatedMovements[relatedMovements.length - 1].createdAt).getTime() - 
                         new Date(relatedMovements[0].createdAt).getTime()) / 1000 / 60)
            : 0;

          let cause = "";
          if (hasMultipleMovements && timeDiff > 0 && timeDiff < 60) {
            cause = `Se detectaron ${relatedMovements.length} movimientos creados con ${timeDiff} minutos de diferencia. Probable causa: La entrega fue editada y el sistema creó movimientos adicionales en lugar de actualizar el existente.`;
          } else if (hasMultipleMovements) {
            cause = `Se encontraron ${relatedMovements.length} movimientos para esta entrega. Posible causa: Ediciones múltiples de la entrega crearon movimientos duplicados sin consolidar.`;
          } else {
            cause = `La cantidad del movimiento (${totalMovementQty}) no coincide con la entrega (${delivery.quantity}). Posible causa: El movimiento fue editado después de su creación.`;
          }

          issues.push({
            type: "QUANTITY_MISMATCH",
            severity: "CRITICAL",
            deliveryId: delivery.id,
            batchCode: delivery.batch.code,
            batchId: delivery.batch.id,
            eppCode: delivery.epp.code,
            eppName: delivery.epp.name,
            eppId: delivery.epp.id,
            deliveryQty: delivery.quantity,
            movementQty: totalMovementQty,
            movementIds: relatedMovements.map(m => m.id),
            movements: relatedMovements.map(m => ({
              id: m.id,
              quantity: m.quantity,
              createdAt: m.createdAt,
              status: m.status,
              userId: m.userId
            })),
            difference: delivery.quantity - totalMovementQty,
            createdAt: delivery.createdAt,
            cause,
            impact: `Stock descontado ${totalMovementQty} en lugar de ${delivery.quantity}, generando discrepancia de ${Math.abs(delivery.quantity - totalMovementQty)} unidades`
          });
        }
      }
    }

    // Movimientos sin entrega
    for (const movement of movements) {
      const relatedDeliveries = deliveries.filter(d =>
        d.eppId === movement.eppId &&
        d.batch.warehouseId === movement.warehouseId &&
        d.batch.code && movement.note?.includes(d.batch.code)
      );

      if (relatedDeliveries.length === 0 && movement.note?.startsWith("Entrega")) {
        const daysSinceCreation = Math.floor((new Date().getTime() - new Date(movement.createdAt).getTime()) / 1000 / 60 / 60 / 24);
        
        let cause = "";
        if (daysSinceCreation < 1) {
          cause = `Inconsistencia temporal: El movimiento se creó hace menos de 24 horas pero no tiene entrega asociada. Posible causa: La entrada aún no se ha registrado o hay un desfase en la sincronización.`;
        } else if (daysSinceCreation < 7) {
          cause = `La entrega asociada fue eliminada hace ${daysSinceCreation} día(s) pero el movimiento de stock no fue revertido. El sistema creó un movimiento huérfano que afecta el inventario.`;
        } else {
          cause = `La entrega asociada fue eliminada hace ${daysSinceCreation} días sin revertir su movimiento de stock. Esto indica un error antiguo en la eliminación de entregas.`;
        }

        issues.push({
          type: "ORPHAN_MOVEMENT",
          severity: "WARNING",
          movementId: movement.id,
          batchCode: movement.note.split(" ")[1],
          eppCode: movement.epp.code,
          eppName: movement.epp.name,
          eppId: movement.eppId,
          quantity: movement.quantity,
          warehouseId: movement.warehouseId,
          warehouse: movement.warehouse.name,
          createdAt: movement.createdAt,
          createdBy: movement.user.email,
          status: movement.status,
          daysSinceCreation,
          cause,
          impact: `${movement.quantity} unidades de stock ${movement.type === 'EXIT' ? 'descontadas sin' : 'añadidas sin'} documentación de entrega. Genera discrepancia en el inventario disponible.`
        });
      }
    }

    return NextResponse.json({
      total: issues.length,
      critical: issues.filter(i => i.severity === "CRITICAL").length,
      warning: issues.filter(i => i.severity === "WARNING").length,
      issues: issues.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      })
    });
  } catch (error) {
    console.error("Error en auditoría:", error);
    const msg = error instanceof Error ? error.message : "Error en auditoría";
    return NextResponse.json({ error: msg }, { status: 403 });
  }
}
