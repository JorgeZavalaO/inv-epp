import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const [
      totalDeliveries,
      totalItems,
      uniqueCollaborators,
      thisMonthDeliveries,
    ] = await Promise.all([
      // Total de entregas (batches)
      prisma.deliveryBatch.count(),
      
      // Total de items entregados
      prisma.delivery.aggregate({
        _sum: { quantity: true },
      }),
      
      // Colaboradores únicos que han recibido entregas
      prisma.deliveryBatch.findMany({
        select: { collaboratorId: true },
        distinct: ['collaboratorId'],
      }),
      
      // Entregas de este mes
      prisma.deliveryBatch.count({
        where: {
          createdAt: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
      }),
    ]);

    return NextResponse.json(
      {
        totalDeliveries,
        totalItems: totalItems._sum.quantity || 0,
        uniqueCollaborators: uniqueCollaborators.length,
        thisMonthDeliveries,
      },
      {
        headers: {
          // Short-lived cache; stats change often but can tolerate brief staleness
          "Cache-Control": "public, max-age=30, s-maxage=30, stale-while-revalidate=30",
        },
      }
    );
  } catch (error: unknown) {
    console.error("Error fetching delivery stats:", error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: "Unknown error" }, { status: 500 });
  }
}
