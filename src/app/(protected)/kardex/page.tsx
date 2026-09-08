import { Suspense } from "react";
import prisma from "@/lib/prisma";
import KardexClient, { KardexRow } from "@/components/kardex/KardexClient";
import { hasPermission } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { createPaginationMeta, getPaginationSkip, parsePagination } from "@/lib/pagination";

export const revalidate = 0;

type SearchParams = {
  query?: string;
  eppId?: string;
  warehouseId?: string;
  type?: string;
  from?: string;
  to?: string;
  page?: string;
  limit?: string;
};

const STOCK_MOVEMENT_TYPES = [
  "ENTRY",
  "EXIT",
  "ADJUSTMENT",
  "TRANSFER_IN",
  "TRANSFER_OUT",
] as const;

type KardexMovementType = (typeof STOCK_MOVEMENT_TYPES)[number];

function isValidStockMovementType(value: string): value is KardexMovementType {
  return STOCK_MOVEMENT_TYPES.includes(value as KardexMovementType);
}

function parsePositiveIntegerId(value?: string) {
  if (value == null || !/^[+-]?\d+$/.test(value)) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function parseDateBoundary(value: string | undefined, endOfDay: boolean) {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return undefined;
  }

  const [, yearValue, monthValue, dayValue] = match;
  const year = Number(yearValue);
  const month = Number(monthValue);
  const day = Number(dayValue);
  const date = new Date(0);
  date.setFullYear(year, month - 1, day);
  date.setHours(endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);

  if (
    !Number.isFinite(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return undefined;
  }

  return date;
}

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
  const eppId = parsePositiveIntegerId(sp.eppId);
  const warehouseId = parsePositiveIntegerId(sp.warehouseId);
  const type = sp.type && isValidStockMovementType(sp.type) ? sp.type : undefined;
  const rawFrom = sp.from?.trim() || undefined;
  const rawTo = sp.to?.trim() || undefined;
  const fromDate = parseDateBoundary(rawFrom, false);
  const toDate = parseDateBoundary(rawTo, true);
  const from = fromDate ? rawFrom : undefined;
  const to = toDate ? rawTo : undefined;
  const requestedPagination = parsePagination(sp.page, sp.limit);

  const displayWhere: Prisma.StockMovementWhereInput = {};

  if (query) {
    displayWhere.OR = [
      { epp: { name: { contains: query, mode: "insensitive" } } },
      { epp: { code: { contains: query, mode: "insensitive" } } },
      { note: { contains: query, mode: "insensitive" } },
      { purchaseOrder: { contains: query, mode: "insensitive" } },
      { user: { email: { contains: query, mode: "insensitive" } } },
    ];
  }

  if (eppId !== undefined) {
    displayWhere.eppId = eppId;
  }

  if (warehouseId !== undefined) {
    displayWhere.warehouseId = warehouseId;
  }

  if (type !== undefined) {
    displayWhere.type = type;
  }

  if (fromDate || toDate) {
    const createdAt: Prisma.DateTimeFilter = {};
    if (fromDate) {
      createdAt.gte = fromDate;
    }
    if (toDate) {
      createdAt.lte = toDate;
    }
    displayWhere.createdAt = createdAt;
  }

  // Balances must be calculated from the complete chronological sequence, not
  // from the requested page or the display-only search/type filters.
  const balanceWhere: Prisma.StockMovementWhereInput = {};
  if (eppId !== undefined) balanceWhere.eppId = eppId;
  if (warehouseId !== undefined) balanceWhere.warehouseId = warehouseId;

  const [movements, balanceMovements, epps, warehouses] = await Promise.all([
    prisma.stockMovement.findMany({
      where: displayWhere,
      include: {
        epp: { select: { code: true, name: true } },
        warehouse: { select: { id: true, name: true } },
        user: { select: { email: true } },
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    }),
    prisma.stockMovement.findMany({
      where: balanceWhere,
      include: {
        epp: { select: { code: true, name: true } },
        warehouse: { select: { id: true, name: true } },
        user: { select: { email: true } },
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
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

  const totals = { entry: 0, exit: 0, adjustment: 0, transferIn: 0, transferOut: 0 };
  const balanceMap = new Map<string, number>();
  const balancesByMovementId = new Map<number, { previousBalance: number; balance: number }>();

  for (const mv of balanceMovements) {
    if (!isValidStockMovementType(mv.type)) {
      continue;
    }

      const key = `${mv.eppId}-${mv.warehouseId}`;
      const previousBalance = balanceMap.get(key) ?? 0;
      let balance = previousBalance;

      if (mv.type === "ENTRY") {
        balance = previousBalance + mv.quantity;
      } else if (mv.type === "EXIT") {
        balance = previousBalance - mv.quantity;
      } else if (mv.type === "TRANSFER_IN") {
        balance = previousBalance + mv.quantity;
      } else if (mv.type === "TRANSFER_OUT") {
        balance = previousBalance - mv.quantity;
      } else {
        balance = mv.quantity;
      }

      balanceMap.set(key, balance);
      balancesByMovementId.set(mv.id, { previousBalance, balance });
  }

  const data = movements.reduce<KardexRow[]>((rows, mv) => {
    if (!isValidStockMovementType(mv.type)) {
      return rows;
    }

    const balance = balancesByMovementId.get(mv.id);
    if (!balance) return rows;

    if (mv.type === "ENTRY") totals.entry += mv.quantity;
    else if (mv.type === "EXIT") totals.exit += mv.quantity;
    else if (mv.type === "TRANSFER_IN") totals.transferIn += mv.quantity;
    else if (mv.type === "TRANSFER_OUT") totals.transferOut += mv.quantity;
    else totals.adjustment += mv.quantity;

    rows.push({
        id: mv.id,
        date: mv.createdAt.toISOString(),
        eppId: mv.eppId,
        eppCode: mv.epp.code,
        eppName: mv.epp.name,
        warehouseId: mv.warehouseId,
        warehouse: mv.warehouse.name,
        type: mv.type as "ENTRY" | "EXIT" | "ADJUSTMENT" | "TRANSFER_IN" | "TRANSFER_OUT",
        quantity: mv.quantity,
        balance: balance.balance,
        previousBalance: balance.previousBalance,
        operator: mv.user.email,
        note: mv.note ?? null,
        status: mv.status ?? null,
        purchaseOrder: mv.purchaseOrder ?? null,
        unitPrice: mv.unitPrice ? Number(mv.unitPrice) : null,
    });
    return rows;
  }, []);

  const pagination = createPaginationMeta(
    requestedPagination.page,
    requestedPagination.limit,
    data.length,
  );
  const pagedData = data.slice(
    getPaginationSkip(pagination),
    getPaginationSkip(pagination) + pagination.limit,
  );

  return (
    <section className="space-y-6 px-4 md:px-8 py-6">
      <Suspense fallback={<div className="min-h-32" />}>
        <KardexClient
          data={pagedData}
          totals={totals}
          pagination={pagination}
          filters={{ epps, warehouses }}
          selected={{ query, eppId, warehouseId, type, from, to, page: pagination.page, limit: pagination.limit }}
        />
      </Suspense>
    </section>
  );
}
