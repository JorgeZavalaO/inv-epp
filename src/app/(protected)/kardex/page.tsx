import prisma from "@/lib/prisma";
import KardexClient from "@/components/kardex/KardexClient";
import { hasPermission } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";

export const revalidate = 0;

type SearchParams = {
  query?: string;
  eppId?: string;
  warehouseId?: string;
  type?: string;
  from?: string;
  to?: string;
};

export default async function KardexPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const canAccess = await hasPermission("stock_movements_manage");
  if (!canAccess) {
    redirect("/dashboard");
  }

  const sp = await searchParams;
  const query = sp.query?.trim() || "";
  const eppId = sp.eppId ? Number(sp.eppId) : undefined;
  const warehouseId = sp.warehouseId ? Number(sp.warehouseId) : undefined;
  const type = sp.type || undefined;
  const from = sp.from || undefined;
  const to = sp.to || undefined;

  const where: Prisma.StockMovementWhereInput = {};

  if (query) {
    where.OR = [
      { epp: { name: { contains: query, mode: "insensitive" } } },
      { epp: { code: { contains: query, mode: "insensitive" } } },
      { note: { contains: query, mode: "insensitive" } },
      { purchaseOrder: { contains: query, mode: "insensitive" } },
      { user: { email: { contains: query, mode: "insensitive" } } },
    ];
  }

  if (eppId) {
    where.eppId = eppId;
  }

  if (warehouseId) {
    where.warehouseId = warehouseId;
  }

  if (type) {
    where.type = type as Prisma.StockMovementWhereInput["type"];
  }

  if (from || to) {
    const createdAt: Prisma.DateTimeFilter = {};
    if (from) {
      const fromDate = new Date(from);
      fromDate.setHours(0, 0, 0, 0);
      createdAt.gte = fromDate;
    }
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      createdAt.lte = toDate;
    }
    where.createdAt = createdAt;
  }

  const [movements, epps, warehouses] = await Promise.all([
    prisma.stockMovement.findMany({
      where,
      include: {
        epp: { select: { code: true, name: true } },
        warehouse: { select: { id: true, name: true } },
        user: { select: { email: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.ePP.findMany({
      select: { id: true, code: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.warehouse.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const totals = { entry: 0, exit: 0, adjustment: 0 };
  const balanceMap = new Map<string, number>();

  const data = movements
    .filter((mv) => ["ENTRY", "EXIT", "ADJUSTMENT"].includes(mv.type))
    .map((mv) => {
      const key = `${mv.eppId}-${mv.warehouseId}`;
      const previousBalance = balanceMap.get(key) ?? 0;
      let balance = previousBalance;

      if (mv.type === "ENTRY") {
        balance = previousBalance + mv.quantity;
        totals.entry += mv.quantity;
      } else if (mv.type === "EXIT") {
        balance = previousBalance - mv.quantity;
        totals.exit += mv.quantity;
      } else {
        balance = mv.quantity;
        totals.adjustment += mv.quantity;
      }

      balanceMap.set(key, balance);

      return {
        id: mv.id,
        date: mv.createdAt.toISOString(),
        eppId: mv.eppId,
        eppCode: mv.epp.code,
        eppName: mv.epp.name,
        warehouseId: mv.warehouseId,
        warehouse: mv.warehouse.name,
        type: mv.type as "ENTRY" | "EXIT" | "ADJUSTMENT",
        quantity: mv.quantity,
        balance,
        previousBalance,
        operator: mv.user.email,
        note: mv.note ?? null,
        status: mv.status ?? null,
        purchaseOrder: mv.purchaseOrder ?? null,
        unitPrice: mv.unitPrice ? Number(mv.unitPrice) : null,
      };
    });

  return (
    <section className="space-y-6 px-4 md:px-8 py-6">
      <KardexClient
        data={data}
        totals={totals}
        filters={{ epps, warehouses }}
        selected={{ query, eppId, warehouseId, type, from, to }}
      />
    </section>
  );
}
