import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

interface Params { params: { id: string } }

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const epp = await prisma.ePP.findUnique({
    where: { id: Number(params.id) },
    select: { id: true, code: true, name: true, stock: true },
  });
  return epp ? NextResponse.json(epp) : NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function PUT(req: Request, { params }: Params) {
  const data = await req.json();
  const updated = await prisma.ePP.update({
    where: { id: Number(params.id) },
    data,
  });
  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: Params) {
  await prisma.ePP.delete({ where: { id: Number(params.id) } });
  return NextResponse.json({});
}