/*
  Warnings:

  - You are about to drop the `Return` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Return" DROP CONSTRAINT "Return_batchId_fkey";

-- DropForeignKey
ALTER TABLE "Return" DROP CONSTRAINT "Return_eppId_fkey";

-- DropForeignKey
ALTER TABLE "Return" DROP CONSTRAINT "Return_userId_fkey";

-- DropForeignKey
ALTER TABLE "Return" DROP CONSTRAINT "Return_warehouseId_fkey";

-- DropTable
DROP TABLE "Return";

-- CreateTable
CREATE TABLE "ReturnBatch" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "warehouseId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReturnBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReturnItem" (
    "id" SERIAL NOT NULL,
    "batchId" INTEGER NOT NULL,
    "eppId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "condition" "DeliveryCondition" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReturnItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReturnBatch_code_key" ON "ReturnBatch"("code");

-- CreateIndex
CREATE INDEX "ReturnBatch_createdAt_idx" ON "ReturnBatch"("createdAt");

-- CreateIndex
CREATE INDEX "ReturnItem_batchId_eppId_idx" ON "ReturnItem"("batchId", "eppId");

-- CreateIndex
CREATE INDEX "Delivery_batchId_eppId_idx" ON "Delivery"("batchId", "eppId");

-- CreateIndex
CREATE INDEX "Warehouse_name_idx" ON "Warehouse"("name");

-- AddForeignKey
ALTER TABLE "ReturnBatch" ADD CONSTRAINT "ReturnBatch_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnBatch" ADD CONSTRAINT "ReturnBatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnItem" ADD CONSTRAINT "ReturnItem_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ReturnBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnItem" ADD CONSTRAINT "ReturnItem_eppId_fkey" FOREIGN KEY ("eppId") REFERENCES "EPP"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
