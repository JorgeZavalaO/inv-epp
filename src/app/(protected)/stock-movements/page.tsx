import prisma from "@/lib/prisma";
import StockMovementsClient from "./StockMovementsClient";
import { hasPermission } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import { MovementStatus, UserRole } from "@prisma/client";
import { auth } from "@/lib/auth";

export const revalidate = 0;
const PAGE_SIZE = 50;

export default async function StockMovementsPage({
  searchParams,
}: {
  /* Next genera PageProps cuyo searchParams es Promise<Record<string,string>> */
  searchParams: Promise<{ page?: string }>;
}) {
  // Verificar permisos
  const canAccess = await hasPermission('stock_movements_manage');
  
  if (!canAccess) {
    redirect('/dashboard');
  }
  
  // Obtener sesión para verificar si es admin
  const session = await auth();
  const isAdmin = session?.user?.role === UserRole.ADMIN;
  
  // Ahora await searchParams para obtener el objeto real
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam ?? "1"));

  // 1) Movimientos + paginación
  const rawList = await prisma.stockMovement.findMany({
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE + 1,
    include: {
      epp:       { select: { code: true, name: true } },
      user:      { select: { email: true } },
      warehouse: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const hasNext   = rawList.length > PAGE_SIZE;
  const movements = hasNext ? rawList.slice(0, PAGE_SIZE) : rawList;
  const hasPrev   = page > 1;

  // 2) Obtener conteo de movimientos pendientes (solo para admins)
  const pendingCount = isAdmin 
    ? await prisma.stockMovement.count({
        where: { status: MovementStatus.PENDING },
      })
    : 0;

  // 3) Mapear datos para el cliente
  type AllowedType = "ENTRY" | "EXIT" | "ADJUSTMENT";
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
  }));

  return (
    <section className="space-y-6 px-4 md:px-8 py-6">
      <StockMovementsClient
        data={data}
        page={page}
        hasPrev={hasPrev}
        hasNext={hasNext}
        pendingCount={pendingCount}
      />
    </section>
  );
}
