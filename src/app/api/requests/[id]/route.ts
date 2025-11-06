import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_: Request, { params }: Params) {

  const { id } = await params;
  const record = await prisma.request.findUnique({
    where: { id: Number(id) },
    include: { approvals: true },
  });
  return record
    ? NextResponse.json(record)
    : NextResponse.json({ error: 'Not found' }, { status: 404 });
}

export async function PUT(req: Request, { params }: Params) {
  await requirePermission("requests_manage");
  const { id } = await params;
  const data = await req.json();
  const updated = await prisma.request.update({
    where: { id: Number(id) },
    data,
  });
  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: Params) {
  await requirePermission("requests_manage");
  const { id } = await params;
  await prisma.request.delete({ where: { id: Number(id) } });
  return NextResponse.json({});
}