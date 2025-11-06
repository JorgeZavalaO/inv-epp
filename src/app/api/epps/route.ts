import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';

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
            { name: { startsWith: q, mode: "insensitive" } },
            { code: { startsWith: q, mode: "insensitive" } },
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
  try {
    await requirePermission('epps_manage');
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'No autorizado';
    return NextResponse.json({ error: msg }, { status: 403 });
  }
  const data = await req.json();
  const created = await prisma.ePP.create({ data });
  return NextResponse.json(created, { status: 201 });
}