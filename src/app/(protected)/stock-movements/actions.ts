"use server";

import prisma from "@/lib/prisma";
import { stockMovementSchema } from "@/schemas/stock-movement-schema";
import { revalidatePath } from "next/cache";
import { ensureAuthUser, requirePermission } from "@/lib/auth-utils";
import { UserRole, MovementStatus } from "@prisma/client";

export async function createMovement(fd: FormData) {
  await requirePermission("stock_movements_manage");
  const data = stockMovementSchema.parse(Object.fromEntries(fd));
  const dbUser = await ensureAuthUser();

  // Determinar si requiere aprobación
  // Los ADMIN pueden crear movimientos aprobados directamente
  // Otros roles deben esperar aprobación
  const requiresApproval = dbUser.role !== UserRole.ADMIN;
  const status = requiresApproval ? MovementStatus.PENDING : MovementStatus.APPROVED;

  // Si requiere aprobación, NO actualizar el stock todavía
  if (requiresApproval) {
    // Solo crear el movimiento en estado PENDING
    await prisma.stockMovement.create({
      data: {
        eppId:       data.eppId,
        warehouseId: data.warehouseId,
        type:        data.type,
        quantity:    data.quantity,
        note:        data.note,
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
  await prisma.$transaction([
    prisma.stockMovement.create({
      data: {
        eppId:       data.eppId,
        warehouseId: data.warehouseId,
        type:        data.type,
        quantity:    data.quantity,
        note:        data.note,
        userId:      dbUser.id,
        status:      MovementStatus.APPROVED,
        approvedById: dbUser.id,
        approvedAt: new Date(),
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

  // Aprobar el movimiento y actualizar el stock
  await prisma.$transaction([
    prisma.stockMovement.update({
      where: { id: movementId },
      data: {
        status: MovementStatus.APPROVED,
        approvedById: dbUser.id,
        approvedAt: new Date(),
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
    // Registrar en auditoría
    prisma.auditLog.create({
      data: {
        action: 'UPDATE',
        entityType: 'STOCK_MOVEMENT',
        entityId: movementId,
        userId: dbUser.id,
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 días
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
