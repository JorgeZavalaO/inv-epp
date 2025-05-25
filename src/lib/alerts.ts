import prisma from "@/lib/prisma";

export async function getLowStockCount(): Promise<number> {
  // Cuenta los EPP donde stock < minStock usando field references
  const count = await prisma.ePP.count({
    where: {
      stock: {
        lt: prisma.ePP.fields.minStock,
      },
    },
  });
  return count;
}
