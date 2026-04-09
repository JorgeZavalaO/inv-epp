import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/auth-utils";
import { UserRole } from "@prisma/client";
import { z } from "zod";

const RESTRICTED_ROLES: UserRole[] = ["SUPERVISOR", "WAREHOUSE_MANAGER"];

/* ── GET /api/users/[id]/warehouses ─────────────────────────────────
   Devuelve los IDs de almacenes asignados al usuario.
   Requiere permiso user_view.
──────────────────────────────────────────────────────────────────── */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requirePermission("user_view");
    const { id: userId } = await params;

    const assignments = await prisma.userWarehouse.findMany({
      where: { userId },
      select: { warehouseId: true },
    });

    return NextResponse.json({
      warehouseIds: assignments.map((a) => a.warehouseId),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error inesperado";
    return NextResponse.json({ error: msg }, { status: 403 });
  }
}

/* ── PUT /api/users/[id]/warehouses ─────────────────────────────────
   Reemplaza las asignaciones de almacenes del usuario.
   Solo ADMIN. Solo aplicable a usuarios con rol SUPERVISOR o WAREHOUSE_MANAGER.
   Body: { warehouseIds: number[] }
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
        { error: "Solo administradores pueden asignar almacenes" },
        { status: 403 },
      );
    }

    const { id: userId } = await params;

    // Validar que el usuario existe y tiene un rol restringido
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, name: true },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 },
      );
    }

    if (!RESTRICTED_ROLES.includes(targetUser.role)) {
      return NextResponse.json(
        {
          error:
            "Solo se pueden asignar almacenes a usuarios con rol Supervisor o Jefe de Almacén",
        },
        { status: 400 },
      );
    }

    // Validar body
    const bodySchema = z.object({
      warehouseIds: z.array(z.number().int().positive()),
    });
    const body = bodySchema.parse(await req.json());

    // Verificar que los almacenes existen
    if (body.warehouseIds.length > 0) {
      const found = await prisma.warehouse.findMany({
        where: { id: { in: body.warehouseIds } },
        select: { id: true },
      });
      if (found.length !== body.warehouseIds.length) {
        return NextResponse.json(
          { error: "Uno o más almacenes no existen" },
          { status: 400 },
        );
      }
    }

    // Reemplazar asignaciones en una transacción
    await prisma.$transaction([
      prisma.userWarehouse.deleteMany({ where: { userId } }),
      ...(body.warehouseIds.length > 0
        ? [
            prisma.userWarehouse.createMany({
              data: body.warehouseIds.map((wId) => ({
                userId,
                warehouseId: wId,
                assignedBy: session.user.id,
              })),
            }),
          ]
        : []),
    ]);

    return NextResponse.json({
      success: true,
      assigned: body.warehouseIds.length,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.errors[0].message },
        { status: 400 },
      );
    }
    const msg = err instanceof Error ? err.message : "Error inesperado";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
