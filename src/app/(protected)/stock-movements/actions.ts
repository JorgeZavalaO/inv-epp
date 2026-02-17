"use server";

import prisma from "@/lib/prisma";
import { stockMovementSchema } from "@/schemas/stock-movement-schema";
import { transferBatchSchema } from "@/schemas/transfer-schema";
import { revalidatePath } from "next/cache";
import { ensureAuthUser, requirePermission } from "@/lib/auth-utils";
import { UserRole, MovementStatus } from "@prisma/client";

function buildTransferCode() {
  return `TRF-${Date.now().toString(36).toUpperCase()}`;
}

async function validateAvailableStock(eppId: number, warehouseId: number, quantity: number) {
  const stock = await prisma.ePPStock.findUnique({
    where: { eppId_warehouseId: { eppId, warehouseId } },
    select: { quantity: true },
  });

  const available = stock?.quantity ?? 0;
  if (available < quantity) {
    throw new Error(`Stock insuficiente en almacén origen. Disponible: ${available}, solicitado: ${quantity}`);
  }
}

export async function createMovement(fd: FormData) {
  await requirePermission("stock_movements_manage");
  const data = stockMovementSchema.parse(Object.fromEntries(fd));
  const dbUser = await ensureAuthUser();

  if (data.type === "EXIT") {
    await validateAvailableStock(data.eppId, data.warehouseId, data.quantity);
  }

  // Determinar si requiere aprobación
  // Los ADMIN pueden crear movimientos aprobados directamente
  // Otros roles deben esperar aprobación
  const requiresApproval = dbUser.role !== UserRole.ADMIN;

  // Si requiere aprobación, NO actualizar el stock todavía
  if (requiresApproval) {
    // Solo crear el movimiento en estado PENDING
    await prisma.stockMovement.create({
      data: {
        eppId:       data.eppId,
        warehouseId: data.warehouseId,
        type:        data.type,
        quantity:    data.quantity,
        unitPrice:   data.unitPrice,
        note:        data.note,
        purchaseOrder: data.purchaseOrder,
        userId:      dbUser.id,
        status:      MovementStatus.PENDING,
      },
    });

    revalidatePath("/stock-movements");
    
    return {
      success: true,
      requiresApproval: true,
      message: "Movimiento creado. Pendiente de aprobación por un administrador.",
    };
  }

  // Si es ADMIN, crear el movimiento y actualizar el stock inmediatamente
  const movementTimestamp = new Date(); // ✅ Timestamp consistente
  await prisma.$transaction([
    prisma.stockMovement.create({
      data: {
        eppId:       data.eppId,
        warehouseId: data.warehouseId,
        type:        data.type,
        quantity:    data.quantity,
        unitPrice:   data.unitPrice,
        note:        data.note,
        purchaseOrder: data.purchaseOrder,
        userId:      dbUser.id,
        status:      MovementStatus.APPROVED,
        approvedById: dbUser.id,
        approvedAt: movementTimestamp,
        createdAt: movementTimestamp, // ✅ Timestamp consistente
      },
    }),
    prisma.ePPStock.upsert({
      where: {
        eppId_warehouseId: {
          eppId:       data.eppId,
          warehouseId: data.warehouseId,
        },
      },
      update: {
        quantity:
          data.type === "ENTRY"
            ? { increment: data.quantity }
            : data.type === "EXIT"
            ? { decrement: data.quantity }
            : { set: data.quantity },
      },
      create: {
        eppId:       data.eppId,
        warehouseId: data.warehouseId,
        quantity:    data.quantity,
      },
    }),
  ]);

  revalidatePath("/stock-movements");
  revalidatePath("/epps");
  
  return {
    success: true,
    requiresApproval: false,
    message: "Movimiento creado y aplicado exitosamente.",
  };
}

export async function createTransfer(fd: FormData) {
  await requirePermission("stock_transfers_manage");

  const rawItems = fd.get("items");
  let items: unknown[] = [];

  if (typeof rawItems === "string" && rawItems.trim().length > 0) {
    try {
      items = JSON.parse(rawItems);
    } catch {
      throw new Error("Formato inválido de productos para traslado");
    }
  }

  const data = transferBatchSchema.parse({
    fromId: fd.get("fromId"),
    toId: fd.get("toId"),
    note: fd.get("note"),
    items,
  });

  const dbUser = await ensureAuthUser();
  const transferCode = buildTransferCode();

  for (const item of data.items) {
    await validateAvailableStock(item.eppId, data.fromId, item.quantity);
  }

  const requiresApproval = dbUser.role !== UserRole.ADMIN;
  const transferNote = data.note?.trim() || "Traslado entre almacenes";
  const timestamp = new Date();

  if (requiresApproval) {
    await prisma.$transaction(
      data.items.flatMap((item) => [
        prisma.stockMovement.create({
          data: {
            eppId: item.eppId,
            warehouseId: data.fromId,
            type: "TRANSFER_OUT",
            quantity: item.quantity,
            note: `[${transferCode}] Salida por traslado. ${transferNote}`,
            purchaseOrder: transferCode,
            userId: dbUser.id,
            status: MovementStatus.PENDING,
            createdAt: timestamp,
          },
        }),
        prisma.stockMovement.create({
          data: {
            eppId: item.eppId,
            warehouseId: data.toId,
            type: "TRANSFER_IN",
            quantity: item.quantity,
            note: `[${transferCode}] Entrada por traslado. ${transferNote}`,
            purchaseOrder: transferCode,
            userId: dbUser.id,
            status: MovementStatus.PENDING,
            createdAt: timestamp,
          },
        }),
      ])
    );

    revalidatePath("/stock-movements");

    return {
      success: true,
      requiresApproval: true,
      message: `Traslado ${transferCode} creado con ${data.items.length} producto(s). Pendiente de aprobación por un administrador.`,
      transferCode,
    };
  }

  await prisma.$transaction(async (tx) => {
    for (const item of data.items) {
      const originStock = await tx.ePPStock.findUnique({
        where: { eppId_warehouseId: { eppId: item.eppId, warehouseId: data.fromId } },
        select: { quantity: true },
      });

      const available = originStock?.quantity ?? 0;
      if (available < item.quantity) {
        throw new Error(`Stock insuficiente en almacén origen para EPP ${item.eppId}. Disponible: ${available}, solicitado: ${item.quantity}`);
      }
    }

    await tx.stockMovement.createMany({
      data: data.items.flatMap((item) => [
        {
          eppId: item.eppId,
          warehouseId: data.fromId,
          type: "TRANSFER_OUT" as const,
          quantity: item.quantity,
          note: `[${transferCode}] Salida por traslado. ${transferNote}`,
          purchaseOrder: transferCode,
          userId: dbUser.id,
          status: MovementStatus.APPROVED,
          approvedById: dbUser.id,
          approvedAt: timestamp,
          createdAt: timestamp,
        },
        {
          eppId: item.eppId,
          warehouseId: data.toId,
          type: "TRANSFER_IN" as const,
          quantity: item.quantity,
          note: `[${transferCode}] Entrada por traslado. ${transferNote}`,
          purchaseOrder: transferCode,
          userId: dbUser.id,
          status: MovementStatus.APPROVED,
          approvedById: dbUser.id,
          approvedAt: timestamp,
          createdAt: timestamp,
        },
      ]),
    });

    for (const item of data.items) {
      await tx.ePPStock.update({
        where: { eppId_warehouseId: { eppId: item.eppId, warehouseId: data.fromId } },
        data: { quantity: { decrement: item.quantity } },
      });

      await tx.ePPStock.upsert({
        where: { eppId_warehouseId: { eppId: item.eppId, warehouseId: data.toId } },
        update: { quantity: { increment: item.quantity } },
        create: { eppId: item.eppId, warehouseId: data.toId, quantity: item.quantity },
      });
    }
  });

  revalidatePath("/stock-movements");
  revalidatePath("/epps");
  revalidatePath("/dashboard");

  return {
    success: true,
    requiresApproval: false,
    message: `Traslado ${transferCode} aplicado exitosamente con ${data.items.length} producto(s).`,
    transferCode,
  };
}

export async function deleteMovement(id: number) {
  await requirePermission("stock_movements_manage");
  const movement = await prisma.stockMovement.findUniqueOrThrow({ where: { id } });
  
  if (movement.type !== "ADJUSTMENT" && movement.quantity === 0) {
    throw new Error("La cantidad debe ser mayor que 0 para ENTRADA / SALIDA");
  }

  // Solo se pueden eliminar movimientos PENDING o se debe revertir el stock si están APPROVED
  if (movement.status === MovementStatus.APPROVED) {
    // Revertir el cambio en el stock
    await prisma.$transaction([
      prisma.stockMovement.delete({ where: { id } }),
      prisma.ePPStock.update({
        where: {
          eppId_warehouseId: {
            eppId:       movement.eppId,
            warehouseId: movement.warehouseId,
          },
        },
        data: {
          quantity:
            movement.type === "ENTRY"
              ? { decrement: movement.quantity }
              : { increment: movement.quantity },
        },
      }),
    ]);
  } else {
    // Si está PENDING o REJECTED, solo eliminar
    await prisma.stockMovement.delete({ where: { id } });
  }

  revalidatePath("/stock-movements");
  revalidatePath("/epps");
  revalidatePath("/dashboard");
}

/**
 * Aprobar un movimiento pendiente (solo ADMIN)
 */
export async function approveMovement(movementId: number) {
  const dbUser = await ensureAuthUser();
  
  // Solo ADMIN puede aprobar
  if (dbUser.role !== UserRole.ADMIN) {
    throw new Error("Solo los administradores pueden aprobar movimientos");
  }

  const movement = await prisma.stockMovement.findUniqueOrThrow({ 
    where: { id: movementId },
    include: {
      epp: true,
      warehouse: true,
      user: true,
    }
  });

  if (movement.status !== MovementStatus.PENDING) {
    throw new Error("Este movimiento ya fue procesado");
  }

  // Aprobar transferencia completa (OUT + IN) en una sola operación
  if (movement.type === "TRANSFER_OUT" || movement.type === "TRANSFER_IN") {
    if (!movement.purchaseOrder) {
      throw new Error("No se pudo identificar el código de transferencia");
    }

    const transferMovements = await prisma.stockMovement.findMany({
      where: {
        purchaseOrder: movement.purchaseOrder,
        status: MovementStatus.PENDING,
        type: { in: ["TRANSFER_OUT", "TRANSFER_IN"] },
      },
      orderBy: { id: "asc" },
    });

    const grouped = new Map<number, { out?: typeof transferMovements[number]; in?: typeof transferMovements[number] }>();
    for (const mv of transferMovements) {
      const pair = grouped.get(mv.eppId) ?? {};
      if (mv.type === "TRANSFER_OUT") {
        pair.out = mv;
      } else if (mv.type === "TRANSFER_IN") {
        pair.in = mv;
      }
      grouped.set(mv.eppId, pair);
    }

    const pairs = Array.from(grouped.values());
    if (pairs.length === 0 || pairs.some((p) => !p.out || !p.in || p.out.quantity !== p.in.quantity)) {
      throw new Error("La transferencia está incompleta o tiene datos inconsistentes");
    }

    await prisma.$transaction(async (tx) => {
      for (const pair of pairs) {
        const transferOut = pair.out!;
        const originStock = await tx.ePPStock.findUnique({
          where: {
            eppId_warehouseId: {
              eppId: transferOut.eppId,
              warehouseId: transferOut.warehouseId,
            },
          },
          select: { quantity: true },
        });

        const available = originStock?.quantity ?? 0;
        if (available < transferOut.quantity) {
          throw new Error(`Stock insuficiente para aprobar traslado de EPP ${transferOut.eppId}. Disponible: ${available}, solicitado: ${transferOut.quantity}`);
        }
      }

      const approvalTimestamp = new Date();
      await tx.stockMovement.updateMany({
        where: {
          id: { in: transferMovements.map((mv) => mv.id) },
          status: MovementStatus.PENDING,
        },
        data: {
          status: MovementStatus.APPROVED,
          approvedById: dbUser.id,
          approvedAt: approvalTimestamp,
        },
      });

      for (const pair of pairs) {
        const transferOut = pair.out!;
        const transferIn = pair.in!;

        await tx.ePPStock.update({
          where: {
            eppId_warehouseId: {
              eppId: transferOut.eppId,
              warehouseId: transferOut.warehouseId,
            },
          },
          data: { quantity: { decrement: transferOut.quantity } },
        });

        await tx.ePPStock.upsert({
          where: {
            eppId_warehouseId: {
              eppId: transferIn.eppId,
              warehouseId: transferIn.warehouseId,
            },
          },
          update: { quantity: { increment: transferIn.quantity } },
          create: {
            eppId: transferIn.eppId,
            warehouseId: transferIn.warehouseId,
            quantity: transferIn.quantity,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          action: 'UPDATE',
          entityType: 'STOCK_MOVEMENT_TRANSFER',
          entityId: movement.id,
          userId: dbUser.id,
          expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          createdAt: approvalTimestamp,
          metadata: {
            description: `Transferencia aprobada: ${movement.purchaseOrder}`,
            transferCode: movement.purchaseOrder,
            totalLines: pairs.length,
            movementIds: transferMovements.map((mv) => mv.id),
          },
        },
      });
    });

    revalidatePath("/stock-movements");
    revalidatePath("/epps");
    revalidatePath("/dashboard");

    return { success: true, message: `Transferencia ${movement.purchaseOrder} aprobada exitosamente` };
  }

  // Aprobar el movimiento y actualizar el stock
  const approvalTimestamp = new Date(); // ✅ Timestamp consistente
  await prisma.$transaction([
    prisma.stockMovement.update({
      where: { id: movementId },
      data: {
        status: MovementStatus.APPROVED,
        approvedById: dbUser.id,
        approvedAt: approvalTimestamp,
      },
    }),
    prisma.ePPStock.upsert({
      where: {
        eppId_warehouseId: {
          eppId:       movement.eppId,
          warehouseId: movement.warehouseId,
        },
      },
      update: {
        quantity:
          movement.type === "ENTRY"
            ? { increment: movement.quantity }
            : movement.type === "EXIT"
            ? { decrement: movement.quantity }
            : { set: movement.quantity },
      },
      create: {
        eppId:       movement.eppId,
        warehouseId: movement.warehouseId,
        quantity:    movement.quantity,
      },
    }),
    // Registrar en auditoría con timestamp consistente
    prisma.auditLog.create({
      data: {
        action: 'UPDATE',
        entityType: 'STOCK_MOVEMENT',
        entityId: movementId,
        userId: dbUser.id,
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 días
        createdAt: approvalTimestamp, // ✅ Timestamp consistente
        metadata: {
          description: `Movimiento aprobado: ${movement.type} de ${movement.quantity} unidades de ${movement.epp.name}`,
          movementId,
          eppName: movement.epp.name,
          warehouseName: movement.warehouse.name,
          requestedBy: movement.user.name,
        },
      },
    }),
  ]);

  revalidatePath("/stock-movements");
  revalidatePath("/epps");
  revalidatePath("/dashboard");

  return { success: true, message: "Movimiento aprobado exitosamente" };
}

/**
 * Rechazar un movimiento pendiente (solo ADMIN)
 */
export async function rejectMovement(movementId: number, rejectionNote: string) {
  const dbUser = await ensureAuthUser();
  
  // Solo ADMIN puede rechazar
  if (dbUser.role !== UserRole.ADMIN) {
    throw new Error("Solo los administradores pueden rechazar movimientos");
  }

  const movement = await prisma.stockMovement.findUniqueOrThrow({ 
    where: { id: movementId },
    include: {
      epp: true,
      warehouse: true,
      user: true,
    }
  });

  if (movement.status !== MovementStatus.PENDING) {
    throw new Error("Este movimiento ya fue procesado");
  }

  // Rechazar transferencia completa (OUT + IN)
  if (movement.type === "TRANSFER_OUT" || movement.type === "TRANSFER_IN") {
    if (!movement.purchaseOrder) {
      throw new Error("No se pudo identificar el código de transferencia");
    }

    const transferMovements = await prisma.stockMovement.findMany({
      where: {
        purchaseOrder: movement.purchaseOrder,
        status: MovementStatus.PENDING,
        type: { in: ["TRANSFER_OUT", "TRANSFER_IN"] },
      },
      select: { id: true },
    });

    if (transferMovements.length < 2) {
      throw new Error("La transferencia está incompleta o ya fue procesada");
    }

    await prisma.$transaction([
      prisma.stockMovement.updateMany({
        where: {
          id: { in: transferMovements.map((mv) => mv.id) },
          status: MovementStatus.PENDING,
        },
        data: {
          status: MovementStatus.REJECTED,
          approvedById: dbUser.id,
          approvedAt: new Date(),
          rejectionNote,
        },
      }),
      prisma.auditLog.create({
        data: {
          action: 'UPDATE',
          entityType: 'STOCK_MOVEMENT_TRANSFER',
          entityId: movement.id,
          userId: dbUser.id,
          expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          metadata: {
            description: `Transferencia rechazada: ${movement.purchaseOrder}`,
            transferCode: movement.purchaseOrder,
            rejectionNote,
          },
        },
      }),
    ]);

    revalidatePath("/stock-movements");

    return { success: true, message: `Transferencia ${movement.purchaseOrder} rechazada` };
  }

  // Rechazar el movimiento (NO actualizar stock)
  await prisma.$transaction([
    prisma.stockMovement.update({
      where: { id: movementId },
      data: {
        status: MovementStatus.REJECTED,
        approvedById: dbUser.id,
        approvedAt: new Date(),
        rejectionNote,
      },
    }),
    // Registrar en auditoría
    prisma.auditLog.create({
      data: {
        action: 'UPDATE',
        entityType: 'STOCK_MOVEMENT',
        entityId: movementId,
        userId: dbUser.id,
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 días
        metadata: {
          description: `Movimiento rechazado: ${movement.type} de ${movement.quantity} unidades de ${movement.epp.name}`,
          movementId,
          eppName: movement.epp.name,
          warehouseName: movement.warehouse.name,
          requestedBy: movement.user.name,
          rejectionNote,
        },
      },
    }),
  ]);

  revalidatePath("/stock-movements");

  return { success: true, message: "Movimiento rechazado" };
}

/**
 * Obtener movimientos pendientes de aprobación
 */
export async function getPendingMovements() {
  const dbUser = await ensureAuthUser();
  
  // Solo ADMIN puede ver movimientos pendientes
  if (dbUser.role !== UserRole.ADMIN) {
    return [];
  }

  return prisma.stockMovement.findMany({
    where: {
      status: MovementStatus.PENDING,
    },
    include: {
      epp: true,
      warehouse: true,
      user: {
        select: {
          name: true,
          email: true,
          role: true,
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  });
}
