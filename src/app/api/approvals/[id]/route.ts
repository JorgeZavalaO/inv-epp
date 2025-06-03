import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_: Request, { params }: Params) {
  
  const { id } = await params;
  const record = await prisma.approval.findUnique({ where: { id: Number(id) } });
  return record
    ? NextResponse.json(record)
    : NextResponse.json({ error: 'Not found' }, { status: 404 });
}

export async function PUT(req: Request, { params }: Params) {
  const { id } = await params;
  const data = await req.json();
  const updated = await prisma.approval.update({
    where: { id: Number(id) },
    data,
  });
  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: Params) {
  const { id } = await params;
  await prisma.approval.delete({ where: { id: Number(id) } });
  return NextResponse.json({});
}
