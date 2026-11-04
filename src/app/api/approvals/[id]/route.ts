import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { getWarehouseScope } from '@/lib/warehouse-scope';
import { canReadRequest, requestWarehouseWhere } from '@/lib/request-scope';
import { z } from 'zod';

interface Params {
  params: Promise<{ id: string }>;
}

const updateSchema = z.object({
  result: z.enum(['APPROVED', 'REJECTED']).optional(),
  comment: z.string().max(500).nullable().optional(),
});

async function findScopedApproval(id: number) {
  const record = await prisma.approval.findUnique({
    where: { id },
    select: {
      id: true,
      requestId: true,
      request: { select: { warehouseId: true } },
    },
  });
  if (!record) return null;
  const scope = await getWarehouseScope();
  if (!canReadRequest(scope, record.request.warehouseId)) return null;

  // Extra safety: null-warehouse legacy requests are only visible in ALL view.
  const stillVisible = await prisma.approval.findFirst({
    where: { id, request: requestWarehouseWhere(scope) },
    select: { id: true },
  });
  return stillVisible ? record : null;
}

export async function GET(_: Request, { params }: Params) {
  try {
    await requirePermission("requests_approve");
  } catch (err) {
    const msg = err instanceof Error ? err.message : "No autorizado";
    return NextResponse.json({ error: msg }, { status: 403 });
  }

  const { id } = await params;
  const record = await findScopedApproval(Number(id));
  return record
    ? NextResponse.json(record)
    : NextResponse.json({ error: 'Not found' }, { status: 404 });
}

export async function PUT(req: Request, { params }: Params) {
  await requirePermission("requests_approve");
  const { id } = await params;
  const record = await findScopedApproval(Number(id));
  if (!record) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const data = updateSchema.parse(await req.json());
  const updated = await prisma.approval.update({
    where: { id: record.id },
    data,
  });
  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: Params) {
  await requirePermission("requests_approve");
  const { id } = await params;
  const record = await findScopedApproval(Number(id));
  if (!record) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await prisma.approval.delete({ where: { id: record.id } });
  return NextResponse.json({});
}
