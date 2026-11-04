import prisma from "@/lib/prisma";
import type { WarehouseScope } from "@/lib/warehouse-scope";

export async function getLowStockCount(scope: WarehouseScope): Promise<number> {
  // Cuenta los EPP donde el stock del alcance activo es menor que minStock.
  // Prisma no compara campos entre sí en el where, así que se resuelve en memoria.
  const allEPPs = await prisma.ePP.findMany({
    select: {
      id: true,
      minStock: true,
      stocks: {
        where:
          scope.effectiveIds === null
            ? {}
            : { warehouseId: { in: scope.effectiveIds } },
        select: { quantity: true },
      },
    },
  });

  return allEPPs.filter((epp) => {
    const totalStock = epp.stocks.reduce(
      (sum, stock) => sum + (stock.quantity || 0),
      0,
    );
    return totalStock < epp.minStock;
  }).length;
}
