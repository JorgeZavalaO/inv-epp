import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requirePermission, hasPermission, hasAnyPermission } from "@/lib/auth-utils";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { createPaginationMeta, getPaginationSkip, parsePagination } from "@/lib/pagination";
import { getWarehouseScope } from "@/lib/warehouse-scope";

/*────────── Schema de validación con Zod ──────────*/
const warehouseSchema = z.object({
  name:     z.string().min(2, "El nombre es requerido"),
  location: z.string().optional(),
});

const scopedHeaders = {
  // The list depends on the session: never cache it publicly.
  "Cache-Control": "private, no-store",
};

/*────────── GET /api/warehouses ──────────*/
export async function GET(req: Request) {
  let scope;
  try {
    scope = await getWarehouseScope();
  } catch {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim();
  const purpose = searchParams.get("purpose");
  const wantsAll = searchParams.get("scope") === "all";

  let warehouseIds: number[] | null = scope.effectiveIds;

  if (purpose === "transfer-destination") {
    const canTransfer = await hasPermission("stock_transfers_manage");
    if (!canTransfer) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    // Transfers may target any warehouse other than the primary one.
    warehouseIds = null;
  } else if (wantsAll) {
    const canListAll = await hasAnyPermission([
      "warehouses_manage",
      "user_view",
    ]);
    if (!canListAll) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    warehouseIds = null;
  }

  const filters: Prisma.WarehouseWhereInput[] = [];

  if (warehouseIds !== null) {
    filters.push({ id: { in: warehouseIds } });
  }

  if (purpose === "transfer-destination" && scope.primaryWarehouseId !== null) {
    filters.push({ id: { not: scope.primaryWarehouseId } });
  }

  if (search) {
    filters.push({
      OR: [
        { name: { contains: search, mode: "insensitive" as const } },
        { location: { contains: search, mode: "insensitive" as const } },
      ],
    });
  }

  const where: Prisma.WarehouseWhereInput = filters.length > 0 ? { AND: filters } : {};
  const hasPagination = searchParams.has("page") || searchParams.has("limit") || Boolean(search);

  if (hasPagination) {
    const requestedPagination = parsePagination(searchParams.get("page"), searchParams.get("limit"));
    const totalCount = await prisma.warehouse.count({ where });
    const pagination = createPaginationMeta(
      requestedPagination.page,
      requestedPagination.limit,
      totalCount,
    );
    const list = await prisma.warehouse.findMany({
      where,
      select: { id: true, name: true, location: true },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      skip: getPaginationSkip(pagination),
      take: pagination.limit,
    });

    return NextResponse.json(
      { warehouses: list, pagination },
      { headers: scopedHeaders },
    );
  }

  const list = await prisma.warehouse.findMany({
    where,
    select: { id: true, name: true, location: true },
    orderBy: [{ name: "asc" }, { id: "asc" }],
  });

  return NextResponse.json(list, { headers: scopedHeaders });
}

/*────────── POST /api/warehouses ──────────*/
export async function POST(req: Request) {
  try {
    await requirePermission("warehouses_manage");
    const body = await req.json();
    const data = warehouseSchema.parse(body);

    const created = await prisma.warehouse.create({ data });
    return NextResponse.json(created, { status: 201 });
  } catch (err: unknown) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      // Violación de restricción única en `name`
      return NextResponse.json(
        { error: "El nombre del almacén ya existe" },
        { status: 400 }
      );  
    }
    if (err instanceof z.ZodError) {
      // Errores de validación
      const messages = err.errors.map((e) => e.message).join(", ");
      return NextResponse.json({ error: messages }, { status: 400 });
    }
    // Otros errores
    const message = err instanceof Error ? err.message : "Error inesperado";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
