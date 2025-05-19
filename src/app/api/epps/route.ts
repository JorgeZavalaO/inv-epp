import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  const list = await prisma.ePP.findMany();
  return NextResponse.json(list);
}

export async function POST(req: Request) {
  const data = await req.json();
  const created = await prisma.ePP.create({ data });
  return NextResponse.json(created, { status: 201 });
}