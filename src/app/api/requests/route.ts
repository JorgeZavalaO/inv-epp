import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  const list = await prisma.request.findMany({ include: { approvals: true } });
  return NextResponse.json(list);
}

export async function POST(req: Request) {
  const data = await req.json();
  const created = await prisma.request.create({ data });
  return NextResponse.json(created, { status: 201 });
}
