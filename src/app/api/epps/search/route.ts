import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { createPaginationMeta, getPaginationSkip, parsePagination } from '@/lib/pagination';

export async function GET(req: Request) {
  try {
    await requirePermission('epps_manage');
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'No autorizado';
    return NextResponse.json({ error: msg }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const requestedPagination = parsePagination(
    searchParams.get("page"),
    searchParams.get("limit"),
  );

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

  const [totalCount, totalStock] = await Promise.all([
    prisma.ePP.count({ where: whereEpp }),
    prisma.ePPStock.aggregate({
      where: { epp: whereEpp },
      _sum: { quantity: true },
    }),
  ]);
  const pagination = createPaginationMeta(
    requestedPagination.page,
    requestedPagination.limit,
    totalCount,
  );

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
    orderBy: [{ name: "asc" }, { id: "asc" }],
    skip: getPaginationSkip(pagination),
    take: pagination.limit,
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

  return NextResponse.json({
    epps: data,
    totalStock: totalStock._sum.quantity ?? 0,
    pagination,
  });
}
