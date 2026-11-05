-- CreateEnum
CREATE TYPE "CollaboratorStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- AlterTable: every existing collaborator becomes ACTIVE
ALTER TABLE "Collaborator" ADD COLUMN "status" "CollaboratorStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateIndex
CREATE INDEX "Collaborator_status_idx" ON "Collaborator"("status");
