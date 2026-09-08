import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { returnBatchSchema } from "@/schemas/return-schema";
import {
  ensureAuthUser,
  requirePermission,
  assertWarehouseAccess,
} from "@/lib/auth-utils";
import { z } from "zod";
import { createPaginationMeta, getPaginationSkip, parsePagination } from "@/lib/pagination";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedPagination = parsePagination(
      searchParams.get("page"),
      searchParams.get("limit"),
      20,
    );
    const totalCount = await prisma.returnBatch.count();
    const pagination = createPaginationMeta(
      requestedPagination.page,
      Math.min(requestedPagination.limit, 50),
      totalCount,
    );

    const batches = await prisma.returnBatch.findMany({
      select: {
        id: true,
        code: true,
        createdAt: true,
        note: true,
        warehouse: { select: { name: true } },
        user: { select: { name: true, email: true } },
        _count: { select: { items: true } },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: getPaginationSkip(pagination),
      take: pagination.limit,
    });

    return NextResponse.json({
      batches,
      pagination,
    });
  } catch (error: unknown) {
    console.error("Error fetching return batches:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    await requirePermission("returns_manage");
    const payload = await req.json();
    const data = returnBatchSchema.parse(payload);
    await assertWarehouseAccess(data.warehouseId);
    const user = await ensureAuthUser();

    const batch = await prisma.$transaction(async (tx) => {
      // 1) generar código autonumérico
      const last = await tx.returnBatch.findFirst({
        where: { code: { startsWith: "RET-" } },
        orderBy: { code: "desc" },
        select: { code: true },
      });
      const num = last ? Number(last.code.replace("RET-", "")) + 1 : 1;
      const code = `RET-${String(num).padStart(4, "0")}`;

      // 2) crear batch
      const rb = await tx.returnBatch.create({
        data: {
          code,
          warehouseId: data.warehouseId,
          userId: user.id,
          note: data.note,
        },
      });

      // 3) crear líneas (optimizado con createMany + bulk upserts)
      const validItems = data.items.filter((i) => i.quantity > 0);
      if (validItems.length === 0) {
        throw new Error("No hay items válidos para devolver");
      }

      // Crear todos los items de una vez
      await tx.returnItem.createMany({
        data: validItems.map((it) => ({
          batchId: rb.id,
          eppId: it.eppId,
          quantity: it.quantity,
          condition: data.condition,
        })),
      });

      // ajustar stock solo si es REUSABLE (bulk operations)
      if (data.condition === "REUSABLE") {
        // Agrupar por warehouse para optimizar upserts
        const warehouseGroups = validItems.reduce(
          (acc, it) => {
            if (!acc[it.warehouseId]) acc[it.warehouseId] = [];
            acc[it.warehouseId].push(it);
            return acc;
          },
          {} as Record<number, typeof validItems>,
        );

        // Ejecutar upserts por warehouse
        for (const [warehouseId, items] of Object.entries(warehouseGroups)) {
          const whId = parseInt(warehouseId);
          await Promise.all(
            items.map((it) =>
              tx.ePPStock.upsert({
                where: {
                  eppId_warehouseId: {
                    eppId: it.eppId,
                    warehouseId: whId,
                  },
                },
                update: { quantity: { increment: it.quantity } },
                create: {
                  eppId: it.eppId,
                  warehouseId: whId,
                  quantity: it.quantity,
                },
              }),
            ),
          );
        }
      }

      return rb;
    });

    return NextResponse.json(batch, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.errors[0].message },
        { status: 400 },
      );
    }
    const msg = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
