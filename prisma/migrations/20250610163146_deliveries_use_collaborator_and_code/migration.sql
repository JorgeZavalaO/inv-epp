/*
  Warnings:

  - You are about to drop the column `employee` on the `DeliveryBatch` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[code]` on the table `DeliveryBatch` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `code` to the `DeliveryBatch` table without a default value. This is not possible if the table is not empty.
  - Added the required column `collaboratorId` to the `DeliveryBatch` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "DeliveryBatch_employee_idx";

-- AlterTable
ALTER TABLE "DeliveryBatch" DROP COLUMN "employee",
ADD COLUMN     "code" VARCHAR(32) NOT NULL,
ADD COLUMN     "collaboratorId" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryBatch_code_key" ON "DeliveryBatch"("code");

-- CreateIndex
CREATE INDEX "DeliveryBatch_collaboratorId_idx" ON "DeliveryBatch"("collaboratorId");

-- AddForeignKey
ALTER TABLE "DeliveryBatch" ADD CONSTRAINT "DeliveryBatch_collaboratorId_fkey" FOREIGN KEY ("collaboratorId") REFERENCES "Collaborator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
