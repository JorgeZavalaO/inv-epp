-- CreateEnum
CREATE TYPE "AccessRequestStatus" AS ENUM ('PENDING', 'CONTACTED', 'CLOSED');

-- CreateTable
CREATE TABLE "AccessRequest" (
    "id"          SERIAL            NOT NULL,
    "name"        VARCHAR(128)      NOT NULL,
    "email"       VARCHAR(160)      NOT NULL,
    "phone"       VARCHAR(32),
    "company"     VARCHAR(128),
    "message"     TEXT,
    "status"      "AccessRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt"   TIMESTAMP(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "handledAt"   TIMESTAMP(3),
    "handledById" TEXT,

    CONSTRAINT "AccessRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AccessRequest_status_createdAt_idx" ON "AccessRequest"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "AccessRequest" ADD CONSTRAINT "AccessRequest_handledById_fkey"
    FOREIGN KEY ("handledById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
