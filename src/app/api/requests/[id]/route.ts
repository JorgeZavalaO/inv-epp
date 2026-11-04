import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { hasAnyPermission } from '@/lib/auth-utils';
import { getWarehouseScope } from '@/lib/warehouse-scope';
import { canReadRequest } from '@/lib/request-scope';
import { z } from 'zod';

interface Params {
  params: Promise<{ id: string }>;
}

const updateSchema = z.object({
  employee: z.string().min(1).max(128).optional(),
  quantity: z.coerce.number().int().positive().optional(),
  reason: z.string().max(255).nullable().optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED']).optional(),
});

async function findScopedRequest(id: number) {
  const record = await prisma.request.findUnique({ where: { id } });
  if (!record) return null;
  const scope = await getWarehouseScope();
  return canReadRequest(scope, record.warehouseId) ? record : null;
}

export async function GET(_: Request, { params }: Params) {
  const canAccess = await hasAnyPermission(['requests_manage', 'requests_approve']);
  if (!canAccess) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { id } = await params;
  const record = await findScopedRequest(Number(id));
  if (!record) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const full = await prisma.request.findUnique({
    where: { id: record.id },
    include: { approvals: true, warehouse: { select: { id: true, name: true } } },
  });
  return NextResponse.json(full);
}

export async function PUT(req: Request, { params }: Params) {
  const canAccess = await hasAnyPermission(['requests_manage', 'requests_approve']);
  if (!canAccess) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { id } = await params;
  const record = await findScopedRequest(Number(id));
  if (!record) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const data = updateSchema.parse(await req.json());
  const updated = await prisma.request.update({
    where: { id: record.id },
    data,
  });
  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: Params) {
  const canAccess = await hasAnyPermission(['requests_manage', 'requests_approve']);
  if (!canAccess) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { id } = await params;
  const record = await findScopedRequest(Number(id));
  if (!record) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await prisma.request.delete({ where: { id: record.id } });
  return NextResponse.json({});
}
