import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

interface Params { params: { id: string } }

export async function GET(_: Request, { params }: Params) {
  const record = await prisma.request.findUnique({ where: { id: Number(params.id) }, include: { approvals: true } });
  return record ? NextResponse.json(record) : NextResponse.json({ error: 'Not found' }, { status: 404 });
}

export async function PUT(req: Request, { params }: Params) {
  const data = await req.json();
  const updated = await prisma.request.update({ where: { id: Number(params.id) }, data });
  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: Params) {
  await prisma.request.delete({ where: { id: Number(params.id) } });
  return NextResponse.json({});
}