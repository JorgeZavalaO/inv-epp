/*
  Warnings:

  - Added the required column `batchId` to the `Return` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Return" ADD COLUMN     "batchId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "Return" ADD CONSTRAINT "Return_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "DeliveryBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
