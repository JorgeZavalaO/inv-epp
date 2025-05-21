import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";

  // solo devolvemos 20 resultados para performance
  const list = await prisma.ePP.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { code: { contains: q, mode: "insensitive" } },
          ],
        }
      : {},
    select: { id: true, code: true, name: true },
    take: 20,
    orderBy: { name: "asc" },
  });

  return NextResponse.json(list);
}

export async function POST(req: Request) {
  const data = await req.json();
  const created = await prisma.ePP.create({ data });
  return NextResponse.json(created, { status: 201 });
}