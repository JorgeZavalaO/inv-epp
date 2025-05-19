import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

interface Params { params: { id: string } }

export async function GET(_: Request, { params }: Params) {
  const record = await prisma.delivery.findUnique({ where: { id: Number(params.id) } });
  return record ? NextResponse.json(record) : NextResponse.json({ error: 'Not found' }, { status: 404 });
}

export async function PUT(req: Request, { params }: Params) {
  const data = await req.json();
  const updated = await prisma.delivery.update({ where: { id: Number(params.id) }, data });
  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: Params) {
  await prisma.delivery.delete({ where: { id: Number(params.id) } });
  return NextResponse.json({});
}