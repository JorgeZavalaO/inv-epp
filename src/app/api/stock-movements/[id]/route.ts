import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { assertWarehouseInScope, canReadWarehouse } from '@/lib/warehouse-scope';
import { z } from 'zod';

interface Params {
  params: Promise<{ id: string }>;
}

const updateSchema = z.object({
  quantity: z.coerce.number().int().optional(),
  unitPrice: z.coerce.number().nonnegative().nullable().optional(),
  note: z.string().max(255).nullable().optional(),
  purchaseOrder: z.string().max(64).nullable().optional(),
});

async function findScopedMovement(id: number) {
  const record = await prisma.stockMovement.findUnique({ where: { id } });
  if (!record) return null;
  const allowed = await canReadWarehouse(record.warehouseId);
  return allowed ? record : null;
}

export async function GET(_: Request, { params }: Params) {
  await requirePermission("stock_movements_manage");
  const { id } = await params;
  const record = await findScopedMovement(Number(id));
  return record
    ? NextResponse.json(record)
    : NextResponse.json({ error: 'Not found' }, { status: 404 });
}

export async function PUT(req: Request, { params }: Params) {
  await requirePermission("stock_movements_manage");
  const { id } = await params;
  const movement = await findScopedMovement(Number(id));
  if (!movement) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  await assertWarehouseInScope(movement.warehouseId);

  const data = updateSchema.parse(await req.json());
  const updated = await prisma.stockMovement.update({
    where: { id: movement.id },
    data,
  });
  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: Params) {
  await requirePermission("stock_movements_manage");
  const { id } = await params;
  const movement = await findScopedMovement(Number(id));
  if (!movement) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  await assertWarehouseInScope(movement.warehouseId);

  await prisma.stockMovement.delete({ where: { id: movement.id } });
  return NextResponse.json({});
}
