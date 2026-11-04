/**
 * Dry-run by default. Assigns a warehouse to legacy Request rows that have
 * warehouseId = NULL, but only when an explicit warehouse is provided.
 *
 * Usage:
 *   pnpm tsx scripts/backfill-request-warehouse.ts
 *   pnpm tsx scripts/backfill-request-warehouse.ts --warehouse-id=3 --apply
 *
 * It never infers the warehouse from the creator's current primary warehouse.
 * Rows that already have a warehouse are never modified.
 */
import prisma from "@/lib/prisma";

function parseArgs(argv: string[]) {
  const apply = argv.includes("--apply");
  const warehouseArg = argv.find((arg) => arg.startsWith("--warehouse-id="));
  const warehouseId = warehouseArg
    ? Number(warehouseArg.split("=")[1])
    : undefined;
  return { apply, warehouseId };
}

async function main() {
  const { apply, warehouseId } = parseArgs(process.argv.slice(2));

  const pendingCount = await prisma.request.count({
    where: { warehouseId: null },
  });

  console.log(`Solicitudes sin almacén: ${pendingCount}`);

  if (pendingCount === 0) return;

  const byCreator = await prisma.request.groupBy({
    by: ["userId"],
    where: { warehouseId: null },
    _count: { _all: true },
  });

  const users = await prisma.user.findMany({
    where: { id: { in: byCreator.map((row) => row.userId) } },
    select: { id: true, email: true, name: true },
  });
  const userMap = new Map(users.map((user) => [user.id, user]));

  console.table(
    byCreator.map((row) => ({
      userId: row.userId,
      user: userMap.get(row.userId)?.email ?? userMap.get(row.userId)?.name ?? "—",
      requests: row._count._all,
    })),
  );

  if (!apply) {
    console.log(
      "Modo dry-run. No se modificó nada. Para aplicar: --warehouse-id=<id> --apply",
    );
    return;
  }

  if (!warehouseId || !Number.isInteger(warehouseId) || warehouseId <= 0) {
    throw new Error("Indica un --warehouse-id válido junto con --apply");
  }

  const warehouse = await prisma.warehouse.findUnique({
    where: { id: warehouseId },
    select: { id: true, name: true },
  });
  if (!warehouse) {
    throw new Error(`El almacén ${warehouseId} no existe`);
  }

  const result = await prisma.request.updateMany({
    where: { warehouseId: null },
    data: { warehouseId },
  });

  console.log(
    `Actualizadas ${result.count} solicitudes con el almacén ${warehouse.name} (#${warehouse.id}).`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
