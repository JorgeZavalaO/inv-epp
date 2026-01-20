import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

type DeliveryBatchWhereInput = {
  OR?: Array<Record<string, unknown>>;
  collaboratorId?: number;
  warehouseId?: number;
  collaboratorLocation?: string;
  createdAt?: {
    gte?: Date;
    lte?: Date;
  };
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // Parámetros de filtros (sin paginación, queremos todos los registros)
    const search = searchParams.get("search") || "";
    const collaboratorId = searchParams.get("collaboratorId");
    const warehouseId = searchParams.get("warehouseId");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const location = searchParams.get("location") || "";

    // Construcción de filtros
    const where: DeliveryBatchWhereInput = {};

    if (search) {
      where.OR = [
        { code: { contains: search, mode: "insensitive" } },
        { collaborator: { name: { contains: search, mode: "insensitive" } } },
        { user: { name: { contains: search, mode: "insensitive" } } },
        { user: { email: { contains: search, mode: "insensitive" } } },
      ];
    }

    if (collaboratorId) {
      where.collaboratorId = parseInt(collaboratorId);
    }

    if (warehouseId) {
      where.warehouseId = parseInt(warehouseId);
    }

    if (location) {
      (where as DeliveryBatchWhereInput & { collaborator?: { location?: { equals: string } } }).collaborator = {
        location: { equals: location },
      };
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = endDate;
      }
    }

    // Consultar todos los lotes que coincidan con los filtros
    const batches = await prisma.deliveryBatch.findMany({
      where,
      select: {
        id: true,
        code: true,
        createdAt: true,
        collaborator: {
          select: {
            name: true,
            documentId: true,
            location: true,
            position: true,
          },
        },
        warehouse: {
          select: {
            name: true,
          },
        },
        user: {
          select: {
            name: true,
          },
        },
        note: true,
        deliveries: {
          select: {
            id: true,
            createdAt: true,
            quantity: true,
            epp: {
              select: {
                code: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Calcular totales
    const totalBatches = batches.length;
    const totalItems = batches.reduce((sum, batch) => sum + batch.deliveries.length, 0);

    console.log(`[Deliveries Preview] Prepared preview: ${totalBatches} batches, ${totalItems} items`);

    return NextResponse.json({
      totalBatches,
      totalItems,
      batches,
    });
  } catch (error: unknown) {
    console.error("[Deliveries Preview] Error:", error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: "Unknown error" }, { status: 500 });
  }
}
