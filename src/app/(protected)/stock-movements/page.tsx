import prisma from "@/lib/prisma";
import StockMovementsClient from "./StockMovementsClient";
import { hasPermission } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import { MovementStatus, Prisma, UserRole } from "@prisma/client";
import { auth } from "@/lib/auth";
import { getWarehouseScope } from "@/lib/warehouse-scope";

export const revalidate = 0;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export default async function StockMovementsPage({
  searchParams,
}: {
  /* Next genera PageProps cuyo searchParams es Promise<Record<string,string>> */
  searchParams: Promise<{ page?: string; query?: string; pageSize?: string }>;
}) {
  // Verificar permisos
  const canAccess = await hasPermission('stock_movements_manage');
  
  if (!canAccess) {
    redirect('/dashboard');
  }
  
  // Obtener sesión para verificar si es admin
  const session = await auth();
  const isAdmin = session?.user?.role === UserRole.ADMIN;
  const scope = await getWarehouseScope();
  const scopedWarehouseIds = scope.effectiveIds;
  
  // Ahora await searchParams para obtener el objeto real
  const { page: pageParam, query, pageSize: pageSizeParam } = await searchParams;
  const page = Math.max(1, Number(pageParam ?? "1"));
  const pageSize = Math.min(Math.max(Number(pageSizeParam ?? DEFAULT_PAGE_SIZE), 5), MAX_PAGE_SIZE);

  // Filtro de búsqueda + alcance de almacenes
  const whereClause: Prisma.StockMovementWhereInput = {};
  if (query) {
    whereClause.epp = {
      OR: [
        { name: { contains: query, mode: "insensitive" as const } },
        { code: { contains: query, mode: "insensitive" as const } },
      ],
    };
  }
  if (scopedWarehouseIds !== null) {
    whereClause.warehouseId = { in: scopedWarehouseIds };
  }

  // 1) Movimientos + paginación
  const rawList = await prisma.stockMovement.findMany({
    where: whereClause,
    skip: (page - 1) * pageSize,
    take: pageSize + 1,
    include: {
      epp:       { select: { code: true, name: true } },
      user:      { select: { email: true } },
      warehouse: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const hasNext   = rawList.length > pageSize;
  const movements = hasNext ? rawList.slice(0, pageSize) : rawList;
  const hasPrev   = page > 1;

  // 2) Obtener conteo de movimientos pendientes (solo para admins).
  //    Las transferencias cuentan una sola vez aunque tengan dos tramos.
  let pendingCount = 0;
  if (isAdmin) {
    const pendingMovements = await prisma.stockMovement.findMany({
      where: { status: MovementStatus.PENDING },
      select: { id: true, warehouseId: true, type: true, purchaseOrder: true },
    });
    const seenGroups = new Set<string>();
    for (const movement of pendingMovements) {
      const inScope =
        scopedWarehouseIds === null ||
        scopedWarehouseIds.includes(movement.warehouseId);
      if (!inScope) continue;
      const isTransfer =
        (movement.type === "TRANSFER_OUT" || movement.type === "TRANSFER_IN") &&
        Boolean(movement.purchaseOrder);
      const groupKey = isTransfer
        ? `transfer:${movement.purchaseOrder}`
        : `movement:${movement.id}`;
      if (seenGroups.has(groupKey)) continue;
      seenGroups.add(groupKey);
      pendingCount += 1;
    }
  }

  // 3) Mapear datos para el cliente
  type AllowedType = "ENTRY" | "EXIT" | "ADJUSTMENT" | "TRANSFER_IN" | "TRANSFER_OUT";
  const data = movements.map((mv) => ({
    id:          mv.id,
    eppId:       mv.eppId,
    date:        mv.createdAt.toISOString(),
    eppCode:     mv.epp.code,
    eppName:     mv.epp.name,
    warehouseId: mv.warehouseId,
    warehouse:   mv.warehouse.name,
    quantity:    mv.quantity,
    type:        mv.type as AllowedType,
    operator:    mv.user.email,
    note:        mv.note ?? null,
    purchaseOrder: mv.purchaseOrder ?? null,
    unitPrice:   mv.unitPrice ? Number(mv.unitPrice) : null,
    status:      mv.status,
    rejectionNote: mv.rejectionNote ?? null,
    // Detectar ambos formatos de anulación
    isCancellation: mv.note ? (mv.note.includes("[ANULACIÓN]") || mv.note.startsWith("Anulación entrega")) : false,
  }));

  return (
    <section className="space-y-6 px-4 md:px-8 py-6">
      <StockMovementsClient
        data={data}
        page={page}
        pageSize={pageSize}
        hasPrev={hasPrev}
        hasNext={hasNext}
        pendingCount={pendingCount}
      />
    </section>
  );
}
