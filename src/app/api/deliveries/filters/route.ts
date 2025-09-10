import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const [collaborators, warehouses, locations] = await Promise.all([
      prisma.collaborator.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      prisma.warehouse.findMany({
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
          // 60s client + proxy cache; allow quick refresh but avoid hammering DB
          "Cache-Control": "public, max-age=60, s-maxage=60, stale-while-revalidate=60",
        },
      }
    );
  } catch (error: unknown) {
    console.error("Error fetching filter options:", error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: "Unknown error" }, { status: 500 });
  }
}
