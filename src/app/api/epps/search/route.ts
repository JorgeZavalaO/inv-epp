import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';

export async function GET(req: Request) {
  try {
    await requirePermission('epps_manage');
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'No autorizado';
    return NextResponse.json({ error: msg }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";

  // Obtener almacenes para el mapa
  const warehousesList = await prisma.warehouse.findMany({
    select: { id: true, name: true },
  });
  const warehouseMap: Record<number, string> = {};
  for (const w of warehousesList) warehouseMap[w.id] = w.name;

  // Buscar EPPs con filtro
  const contains = (val: string) => ({ contains: val, mode: "insensitive" as const });
  const whereEpp = q
    ? { OR: [{ name: contains(q) }, { code: contains(q) }, { category: contains(q) }] }
    : {};

  const epps = await prisma.ePP.findMany({
    where: whereEpp,
    select: {
      id: true,
      code: true,
      name: true,
      category: true,
      subcategory: true,
      description: true,
      minStock: true,
      stocks: {
        select: { warehouseId: true, quantity: true },
      },
      _count: { select: { movements: true } },
    },
    orderBy: { name: "asc" },
    take: 100, // Límite razonable para búsqueda en tiempo real
  });

  // Mapear datos al formato esperado
  const data = epps.map((e) => ({
    id: e.id,
    code: e.code,
    name: e.name,
    category: e.category,
    subcategory: e.subcategory,
    description: e.description,
    minStock: e.minStock,
    stocks: e.stocks,
    _count: e._count,
  }));

  return NextResponse.json(data);
}