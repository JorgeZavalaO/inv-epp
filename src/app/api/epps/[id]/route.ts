import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const epp = await prisma.ePP.findUnique({
    where: { id: Number(id) },
    select: {
      id: true,
      code: true,
      name: true,
      stocks: {
        select: {
          quantity: true,
          warehouse: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  return epp
    ? NextResponse.json(epp)
    : NextResponse.json({ error: 'No encontrado' }, { status: 404 });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requirePermission("epps_manage");
  const { id } = await params;
  const data = await req.json();
  const updated = await prisma.ePP.update({
    where: { id: Number(id) },
    data,
  });
  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  await requirePermission("epps_manage");
  const { id } = await params;
  await prisma.ePP.delete({ where: { id: Number(id) } });
  return NextResponse.json({});
}
