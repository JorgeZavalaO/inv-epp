import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { hasAnyPermission } from "@/lib/auth-utils";
import { getWarehouseScope } from "@/lib/warehouse-scope";
import type { Prisma } from "@prisma/client";

export async function GET() {
  let scope;
  try {
    const canAccess = await hasAnyPermission([
      "deliveries_manage",
      "deliveries_export",
    ]);
    if (!canAccess) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    scope = await getWarehouseScope();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "No autorizado";
    return NextResponse.json({ error: msg }, { status: 403 });
  }

  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const batchScope: Prisma.DeliveryBatchWhereInput =
      scope.effectiveIds === null
        ? {}
        : { warehouseId: { in: scope.effectiveIds } };

    const [totalDeliveries, totalItems, uniqueCollaborators, thisMonthDeliveries] =
      await Promise.all([
        // Total de entregas (batches)
        prisma.deliveryBatch.count({ where: batchScope }),

        // Total de items entregados
        prisma.delivery.aggregate({
          _sum: { quantity: true },
          where:
            scope.effectiveIds === null
              ? {}
              : { batch: { warehouseId: { in: scope.effectiveIds } } },
        }),

        // Colaboradores únicos que han recibido entregas
        prisma.deliveryBatch.findMany({
          where: batchScope,
          select: { collaboratorId: true },
          distinct: ["collaboratorId"],
        }),

        // Entregas de este mes
        prisma.deliveryBatch.count({
          where: {
            AND: [
              batchScope,
              { createdAt: { gte: startOfMonth, lte: endOfMonth } },
            ],
          },
        }),
      ]);

    return NextResponse.json(
      {
        totalDeliveries,
        totalItems: totalItems._sum.quantity || 0,
        uniqueCollaborators: uniqueCollaborators.length,
        thisMonthDeliveries,
      },
      {
        headers: {
          // Depende de la sesión: nunca cachear públicamente.
          "Cache-Control": "private, no-store",
        },
      },
    );
  } catch (error: unknown) {
    console.error("Error fetching delivery stats:", error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: "Unknown error" }, { status: 500 });
  }
}
