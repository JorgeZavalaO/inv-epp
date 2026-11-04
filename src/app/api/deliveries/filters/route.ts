import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getWarehouseScope } from "@/lib/warehouse-scope";

export async function GET() {
  let scope;
  try {
    scope = await getWarehouseScope();
  } catch {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  try {
    const [collaborators, warehouses, locations] = await Promise.all([
      prisma.collaborator.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      prisma.warehouse.findMany({
        where: scope.effectiveIds === null ? {} : { id: { in: scope.effectiveIds } },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      // Obtener sedes únicas (location) de colaboradores
      prisma.collaborator.findMany({
        select: { location: true },
        distinct: ["location"],
        where: { location: { not: null } },
        orderBy: { location: "asc" },
      }),
    ]);

    // Normalizar locations para devolver id/name style
    const uniqueLocations = locations
      .map((l) => ({ id: l.location ?? "", name: l.location ?? "" }))
      .filter((l) => l.name !== "");

    return NextResponse.json(
      {
        collaborators,
        warehouses,
        locations: uniqueLocations,
      },
      {
        headers: {
          // Depende de la sesión: nunca cachear públicamente.
          "Cache-Control": "private, no-store",
        },
      },
    );
  } catch (error: unknown) {
    console.error("Error fetching filter options:", error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: "Unknown error" }, { status: 500 });
  }
}
