import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { ensureAuthUser, requirePermission } from '@/lib/auth-utils';
import { getWarehouseScope } from '@/lib/warehouse-scope';
import { requestWarehouseWhere } from '@/lib/request-scope';
import { z } from 'zod';

export async function GET() {
  try {
    await requirePermission("requests_approve");
  } catch (err) {
    const msg = err instanceof Error ? err.message : "No autorizado";
    return NextResponse.json({ error: msg }, { status: 403 });
  }

  const scope = await getWarehouseScope();
  const list = await prisma.approval.findMany({
    where: { request: requestWarehouseWhere(scope) },
  });
  return NextResponse.json(list);
}

const createSchema = z.object({
  requestId: z.coerce.number().int().positive(),
  result: z.enum(['APPROVED', 'REJECTED']),
  comment: z.string().max(500).optional(),
});

export async function POST(req: Request) {
  await requirePermission("requests_approve");
  const parsed = createSchema.parse(await req.json());
  const user = await ensureAuthUser();
  const scope = await getWarehouseScope();

  const request = await prisma.request.findUnique({
    where: { id: parsed.requestId },
    select: { id: true, warehouseId: true },
  });
  if (!request) {
    return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
  }

  const scopeWhere = requestWarehouseWhere(scope);
  const visible = await prisma.request.findFirst({
    where: { id: request.id, ...scopeWhere },
    select: { id: true },
  });
  if (!visible) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const created = await prisma.approval.create({
    data: {
      requestId: parsed.requestId,
      result: parsed.result,
      comment: parsed.comment,
      userId: user.id,
    },
  });
  return NextResponse.json(created, { status: 201 });
}
