import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import type { Prisma, StockMovementType } from "@prisma/client";
import { requirePermission } from "@/lib/auth-utils";
import {
  assertWarehouseInScope,
  getWarehouseScope,
  narrowScope,
} from "@/lib/warehouse-scope";
import { z } from "zod";

const movementSchema = z.object({
  eppId: z.coerce.number().int().positive(),
  warehouseId: z.coerce.number().int().positive(),
  type: z.enum(["ENTRY", "EXIT", "TRANSFER_IN", "TRANSFER_OUT", "ADJUSTMENT"]),
  quantity: z.coerce.number().int(),
  unitPrice: z.coerce.number().nonnegative().optional(),
  note: z.string().max(255).optional(),
  purchaseOrder: z.string().max(64).optional(),
});

export async function GET(request: Request) {
  let scope;
  try {
    scope = await getWarehouseScope();
  } catch {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100); // Max 100
    const skip = (page - 1) * limit;

    const search = searchParams.get("search") || "";
    const eppId = searchParams.get("eppId");
    const warehouseId = searchParams.get("warehouseId");
    const type = searchParams.get("type");

    // Filtros WHERE
    const where: Prisma.StockMovementWhereInput = {};
    if (search) {
      where.OR = [
        { epp: { name: { contains: search, mode: "insensitive" } } },
        { epp: { code: { contains: search, mode: "insensitive" } } },
        { note: { contains: search, mode: "insensitive" } },
      ];
    }
    if (eppId) where.eppId = parseInt(eppId);
    if (type && isValidStockMovementType(type))
      where.type = type as StockMovementType;

    const requestedWarehouseId = warehouseId ? Number(warehouseId) : undefined;
    const warehouseIds = narrowScope(scope, requestedWarehouseId);
    if (warehouseIds !== null) {
      where.warehouseId = { in: warehouseIds };
    }

    const [movements, totalCount] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        select: {
          id: true,
          type: true,
          quantity: true,
          note: true,
          createdAt: true,
          epp: { select: { code: true, name: true } },
          warehouse: { select: { name: true } },
          user: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.stockMovement.count({ where }),
    ]);

    return NextResponse.json({
      movements,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: page < Math.ceil(totalCount / limit),
        hasPrev: page > 1,
      },
    });
  } catch (error: unknown) {
    console.error("Error fetching stock movements:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

function isValidStockMovementType(type: string): type is StockMovementType {
  return [
    "ENTRY",
    "EXIT",
    "TRANSFER_IN",
    "TRANSFER_OUT",
    "ADJUSTMENT",
  ].includes(type);
}

export async function POST(req: Request) {
  const user = await requirePermission("stock_movements_manage");
  const data = movementSchema.parse(await req.json());
  await assertWarehouseInScope(data.warehouseId);

  const created = await prisma.stockMovement.create({
    data: {
      ...data,
      userId: user.id,
    },
  });
  return NextResponse.json(created, { status: 201 });
}
