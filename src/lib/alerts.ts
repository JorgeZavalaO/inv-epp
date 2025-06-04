import prisma from "@/lib/prisma";

export async function getLowStockCount(): Promise<number> {
  // Cuenta los EPP donde stock < minStock usando field references
  // Prisma does not support field-to-field comparison in the where clause directly.
  // Fetch all EPPs and count those where stocks < minStock.
  const allEPPs = await prisma.ePP.findMany({
    select: { id: true, stocks: true, minStock: true }
  });
  const count = allEPPs.filter(epp => {
    // Sum all quantities in the stocks array
    const totalStock = Array.isArray(epp.stocks)
      ? epp.stocks.reduce((sum, stock) => sum + (stock.quantity || 0), 0)
      : 0;
    return totalStock < epp.minStock;
  }).length;
  return count;
}
