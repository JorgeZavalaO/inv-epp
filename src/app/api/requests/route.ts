import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import type { RequestStatus, Prisma } from '@prisma/client';
import { ensureAuthUser, hasAnyPermission } from '@/lib/auth-utils';
import { getWarehouseScope, isInScope } from '@/lib/warehouse-scope';
import { requestWarehouseWhere } from '@/lib/request-scope';
import { z } from 'zod';

const createSchema = z.object({
  eppId: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().positive(),
  employee: z.string().min(1).max(128),
  reason: z.string().max(255).optional(),
  warehouseId: z.coerce.number().int().positive().optional(),
});

export async function GET(request: Request) {
  const canAccess = await hasAnyPermission(['requests_manage', 'requests_approve']);
  if (!canAccess) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  try {
    const scope = await getWarehouseScope();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
    const skip = (page - 1) * limit;
    
    const status = searchParams.get("status");
    const where: Prisma.RequestWhereInput = requestWarehouseWhere(scope);
    if (status && isValidRequestStatus(status)) {
      where.status = status as RequestStatus;
    }

    const [requests, totalCount] = await Promise.all([
      prisma.request.findMany({
        where,
        select: {
          id: true,
          employee: true,
          quantity: true,
          reason: true,
          status: true,
          createdAt: true,
          warehouseId: true,
          warehouse: { select: { id: true, name: true } },
          epp: { select: { code: true, name: true } },
          user: { select: { name: true, email: true } },
          _count: { select: { approvals: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.request.count({ where }),
    ]);

    return NextResponse.json({
      requests,
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
    console.error("Error fetching requests:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function isValidRequestStatus(status: string): status is RequestStatus {
  return ['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED'].includes(status);
}

export async function POST(req: Request) {
  const canAccess = await hasAnyPermission(['requests_manage', 'requests_approve']);
  if (!canAccess) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  try {
    const parsed = createSchema.parse(await req.json());
    const user = await ensureAuthUser();
    const scope = await getWarehouseScope();

    const warehouseId = parsed.warehouseId ?? scope.primaryWarehouseId;
    if (warehouseId === null) {
      return NextResponse.json(
        { error: "Indica el almacén o configura tu almacén principal" },
        { status: 400 },
      );
    }
    if (!isInScope(scope, warehouseId)) {
      return NextResponse.json(
        { error: "No autorizado - Almacén fuera de tu alcance actual" },
        { status: 403 },
      );
    }

    const created = await prisma.request.create({
      data: {
        eppId: parsed.eppId,
        quantity: parsed.quantity,
        employee: parsed.employee,
        reason: parsed.reason,
        warehouseId,
        userId: user.id,
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message ?? "Datos inválidos" },
        { status: 400 },
      );
    }
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
