import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';


interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_: Request, { params }: Params) {

  const { id } = await params;
  const epp = await prisma.ePP.findUnique({
    where: { id: Number(id) },
    select: { id: true, code: true, name: true, stock: true },
  });

  return epp
    ? NextResponse.json(epp)
    : NextResponse.json({ error: 'Not found' }, { status: 404 });
}

export async function PUT(req: Request, { params }: Params) {
  const { id } = await params;
  const data = await req.json();
  const updated = await prisma.ePP.update({
    where: { id: Number(id) },
    data,
  });
  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: Params) {
  const { id } = await params;
  await prisma.ePP.delete({ where: { id: Number(id) } });
  return NextResponse.json({});
}
