import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';

export async function GET() {
  const list = await prisma.approval.findMany();
  return NextResponse.json(list);
}

export async function POST(req: Request) {
  await requirePermission("requests_approve");
  const data = await req.json();
  const created = await prisma.approval.create({ data });
  return NextResponse.json(created, { status: 201 });
}

