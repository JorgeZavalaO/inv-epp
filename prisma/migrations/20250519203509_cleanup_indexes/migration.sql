/*
  Warnings:

  - You are about to alter the column `code` on the `EPP` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(32)`.
  - You are about to alter the column `name` on the `EPP` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(128)`.
  - You are about to alter the column `category` on the `EPP` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to drop the `_UserEPPs` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_UserEPPs" DROP CONSTRAINT "_UserEPPs_A_fkey";

-- DropForeignKey
ALTER TABLE "_UserEPPs" DROP CONSTRAINT "_UserEPPs_B_fkey";

-- AlterTable
ALTER TABLE "EPP" ALTER COLUMN "code" SET DATA TYPE VARCHAR(32),
ALTER COLUMN "name" SET DATA TYPE VARCHAR(128),
ALTER COLUMN "category" SET DATA TYPE VARCHAR(64);

-- DropTable
DROP TABLE "_UserEPPs";

-- CreateIndex
CREATE INDEX "EPP_name_idx" ON "EPP"("name");

-- CreateIndex
CREATE INDEX "EPP_category_idx" ON "EPP"("category");
