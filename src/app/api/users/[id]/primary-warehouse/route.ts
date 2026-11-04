import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { WAREHOUSE_RESTRICTED_ROLES } from "@/lib/warehouse-scope";
import { UserRole } from "@prisma/client";
import { z } from "zod";

const bodySchema = z.object({
  primaryWarehouseId: z.number().int().positive().nullable(),
});

/* ── PUT /api/users/[id]/primary-warehouse ───────────────────────────
   Sets or clears the user's primary/default warehouse. ADMIN only.
   Restricted roles may only use one of their assigned warehouses.
──────────────────────────────────────────────────────────────────── */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Solo administradores pueden asignar el almacén principal" },
        { status: 403 },
      );
    }

    const { id: userId } = await params;
    const body = bodySchema.parse(await req.json());

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 },
      );
    }

    if (body.primaryWarehouseId !== null) {
      const warehouse = await prisma.warehouse.findUnique({
        where: { id: body.primaryWarehouseId },
        select: { id: true },
      });
      if (!warehouse) {
        return NextResponse.json(
          { error: "El almacén seleccionado no existe" },
          { status: 400 },
        );
      }

      if (WAREHOUSE_RESTRICTED_ROLES.includes(targetUser.role as UserRole)) {
        const assigned = await prisma.userWarehouse.findUnique({
          where: {
            userId_warehouseId: {
              userId,
              warehouseId: body.primaryWarehouseId,
            },
          },
          select: { id: true },
        });
        if (!assigned) {
          return NextResponse.json(
            {
              error:
                "El almacén principal debe estar entre los almacenes asignados al usuario",
            },
            { status: 400 },
          );
        }
      }
    }

    await prisma.user.update({
      where: { id: userId },
      data: { primaryWarehouseId: body.primaryWarehouseId },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.errors[0]?.message ?? "Datos inválidos" },
        { status: 400 },
      );
    }
    const message = err instanceof Error ? err.message : "Error inesperado";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
