/*
  Warnings:

  - You are about to drop the column `condition` on the `Delivery` table. All the data in the column will be lost.
  - You are about to drop the column `employee` on the `Delivery` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Delivery` table. All the data in the column will be lost.
  - Added the required column `batchId` to the `Delivery` table without a default value. This is not possible if the table is not empty.

*/
BEGIN;

CREATE TABLE "DeliveryBatch" (
  "id"        SERIAL PRIMARY KEY,
  "employee"  TEXT NOT NULL,
  "note"      TEXT,
  "userId"    INTEGER,                -- ← ahora NULLABLE
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DeliveryBatch_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE SET NULL                -- o RESTRICT, como prefieras
);

-- lote placeholder sin userId
INSERT INTO "DeliveryBatch"(id, employee, note)
VALUES (1, 'Migrated deliveries', 'Batch para antiguos registros')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE "Delivery" ADD COLUMN "batchId" INTEGER;
UPDATE "Delivery" SET "batchId" = 1 WHERE "batchId" IS NULL;
ALTER TABLE "Delivery" ALTER COLUMN "batchId" SET NOT NULL;

ALTER TABLE "Delivery" 
  DROP CONSTRAINT IF EXISTS "Delivery_userId_fkey";
ALTER TABLE "Delivery"
  DROP COLUMN IF EXISTS "employee",
  DROP COLUMN IF EXISTS "condition",
  DROP COLUMN IF EXISTS "userId";

ALTER TABLE "Delivery"
  ADD CONSTRAINT "Delivery_batchId_fkey"
    FOREIGN KEY ("batchId") REFERENCES "DeliveryBatch"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;