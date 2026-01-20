import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth-utils";

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
    
    // Parámetros de paginación
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;
    
    // Parámetros de filtros
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
      // Filtrar por la ubicación de colaborador
      (where as DeliveryBatchWhereInput & { collaborator?: { location?: { equals: string } } }).collaborator = { location: { equals: location } };
    }
    
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999); // Final del día
        where.createdAt.lte = endDate;
      }
    }

    // Consulta con paginación
    const [batches, totalCount] = await Promise.all([
      prisma.deliveryBatch.findMany({
        where,
        select: {
          id: true,
          code: true,
          createdAt: true,
          collaboratorId: true,
          warehouseId: true,
          note: true,
          collaborator: { select: { name: true, documentId: true } },
          user: { select: { name: true, email: true } },
          warehouse: { select: { name: true } },
          _count: { select: { deliveries: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.deliveryBatch.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      batches,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error: unknown) {
    console.error("Error fetching delivery batches:", error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: "Unknown error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await requirePermission("deliveries_manage");
    const data = await req.json();
    const created = await prisma.deliveryBatch.create({ data });
    return NextResponse.json(created, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: "Unknown error" }, { status: 500 });
  }
}
