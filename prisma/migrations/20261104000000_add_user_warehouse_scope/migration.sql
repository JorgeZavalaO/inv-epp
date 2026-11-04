-- CreateEnum
CREATE TYPE "WarehouseViewMode" AS ENUM ('PRIMARY', 'ALL');

-- AlterTable: User (nullable + default keeps this metadata-only, no table rewrite)
ALTER TABLE "User"
    ADD COLUMN "primaryWarehouseId" INTEGER,
    ADD COLUMN "warehouseViewMode"  "WarehouseViewMode" NOT NULL DEFAULT 'ALL';

-- AlterTable: Request (nullable because historical rows have no warehouse)
ALTER TABLE "Request" ADD COLUMN "warehouseId" INTEGER;

-- CreateIndex
CREATE INDEX "User_primaryWarehouseId_idx" ON "User"("primaryWarehouseId");
CREATE INDEX "Request_warehouseId_createdAt_idx" ON "Request"("warehouseId", "createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_primaryWarehouseId_fkey"
    FOREIGN KEY ("primaryWarehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_warehouseId_fkey"
    FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Deterministic backfill: users with exactly one warehouse assignment get that warehouse as primary.
-- Users with zero or several assignments are left NULL on purpose (no guessing).
UPDATE "User" AS u
SET "primaryWarehouseId" = uw."warehouseId"
FROM (
    SELECT "userId", MIN("warehouseId") AS "warehouseId"
    FROM "UserWarehouse"
    GROUP BY "userId"
    HAVING COUNT(*) = 1
) AS uw
WHERE u."id" = uw."userId"
  AND u."primaryWarehouseId" IS NULL;
