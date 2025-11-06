import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import type { RequestStatus, Prisma } from '@prisma/client';
import { requirePermission } from '@/lib/auth-utils';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
    const skip = (page - 1) * limit;
    
    const status = searchParams.get("status");
    const where: Prisma.RequestWhereInput = {};
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
  await requirePermission("requests_manage");
  const data = await req.json();
  const created = await prisma.request.create({ data });
  return NextResponse.json(created, { status: 201 });
}
