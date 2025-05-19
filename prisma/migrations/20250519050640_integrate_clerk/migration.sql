/*
  Warnings:

  - You are about to drop the column `password` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `roleId` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `Role` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[clerkId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_roleId_fkey";

-- AlterTable
ALTER TABLE "Delivery" ADD COLUMN     "condition" "DeliveryCondition";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "password",
DROP COLUMN "roleId",
ADD COLUMN     "clerkId" TEXT;

-- DropTable
DROP TABLE "Role";

-- DropEnum
DROP TYPE "RoleName";

-- CreateTable
CREATE TABLE "_UserEPPs" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_UserEPPs_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_UserEPPs_B_index" ON "_UserEPPs"("B");

-- CreateIndex
CREATE UNIQUE INDEX "User_clerkId_key" ON "User"("clerkId");

-- AddForeignKey
ALTER TABLE "_UserEPPs" ADD CONSTRAINT "_UserEPPs_A_fkey" FOREIGN KEY ("A") REFERENCES "EPP"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserEPPs" ADD CONSTRAINT "_UserEPPs_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
