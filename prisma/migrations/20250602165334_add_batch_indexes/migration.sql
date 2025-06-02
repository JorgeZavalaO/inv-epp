/*
  Warnings:

  - Made the column `userId` on table `DeliveryBatch` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "DeliveryBatch" DROP CONSTRAINT "DeliveryBatch_userId_fkey";

-- AlterTable
ALTER TABLE "DeliveryBatch" ALTER COLUMN "userId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "DeliveryBatch_createdAt_idx" ON "DeliveryBatch"("createdAt");

-- CreateIndex
CREATE INDEX "DeliveryBatch_employee_idx" ON "DeliveryBatch"("employee");

-- AddForeignKey
ALTER TABLE "DeliveryBatch" ADD CONSTRAINT "DeliveryBatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
