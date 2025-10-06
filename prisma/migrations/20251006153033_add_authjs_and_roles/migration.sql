/*
  Warnings:

  - The primary key for the `User` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `clerkId` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `imageUrl` on the `User` table. All the data in the column will be lost.
  - Added the required column `password` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'SUPERVISOR', 'WAREHOUSE_MANAGER', 'OPERATOR', 'VIEWER');

-- Paso 1: Crear tabla temporal para almacenar el mapeo de IDs antiguos a nuevos
CREATE TABLE "UserIdMapping" (
    "oldId" INTEGER NOT NULL,
    "newId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    PRIMARY KEY ("oldId")
);

-- Paso 2: Insertar los IDs actuales en la tabla de mapeo con nuevos CUID
INSERT INTO "UserIdMapping" ("oldId", "newId", "email")
SELECT id, CONCAT('user_', md5(random()::text || clock_timestamp()::text)::uuid), email
FROM "User";

-- Paso 3: Agregar columnas temporales a User
ALTER TABLE "User" ADD COLUMN "newId" TEXT;
ALTER TABLE "User" ADD COLUMN "password" TEXT DEFAULT '$2a$10$defaulthashedpasswordplaceholder'; -- Temporal
ALTER TABLE "User" ADD COLUMN "emailVerified" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "image" TEXT;
ALTER TABLE "User" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN "lastLoginAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'ADMIN'; -- Los usuarios existentes serán ADMIN

-- Paso 4: Actualizar User con los nuevos IDs
UPDATE "User" u
SET "newId" = m."newId"
FROM "UserIdMapping" m
WHERE u.id = m."oldId";

-- Paso 5: Agregar columnas temporales a las tablas relacionadas
ALTER TABLE "StockMovement" ADD COLUMN "newUserId" TEXT;
ALTER TABLE "DeliveryBatch" ADD COLUMN "newUserId" TEXT;
ALTER TABLE "ReturnBatch" ADD COLUMN "newUserId" TEXT;
ALTER TABLE "Request" ADD COLUMN "newUserId" TEXT;
ALTER TABLE "Approval" ADD COLUMN "newUserId" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "newUserId" TEXT;

-- Paso 6: Actualizar las foreign keys con los nuevos IDs
UPDATE "StockMovement" sm
SET "newUserId" = m."newId"
FROM "UserIdMapping" m
WHERE sm."userId" = m."oldId";

UPDATE "DeliveryBatch" db
SET "newUserId" = m."newId"
FROM "UserIdMapping" m
WHERE db."userId" = m."oldId";

UPDATE "ReturnBatch" rb
SET "newUserId" = m."newId"
FROM "UserIdMapping" m
WHERE rb."userId" = m."oldId";

UPDATE "Request" r
SET "newUserId" = m."newId"
FROM "UserIdMapping" m
WHERE r."userId" = m."oldId";

UPDATE "Approval" a
SET "newUserId" = m."newId"
FROM "UserIdMapping" m
WHERE a."userId" = m."oldId";

UPDATE "AuditLog" al
SET "newUserId" = m."newId"
FROM "UserIdMapping" m
WHERE al."userId" = m."oldId";

-- Paso 7: Drop foreign keys antiguas

-- DropForeignKey
ALTER TABLE "Approval" DROP CONSTRAINT "Approval_userId_fkey";

-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_userId_fkey";

-- DropForeignKey
ALTER TABLE "DeliveryBatch" DROP CONSTRAINT "DeliveryBatch_userId_fkey";

-- DropForeignKey
ALTER TABLE "Request" DROP CONSTRAINT "Request_userId_fkey";

-- DropForeignKey
ALTER TABLE "ReturnBatch" DROP CONSTRAINT "ReturnBatch_userId_fkey";

-- DropForeignKey
ALTER TABLE "StockMovement" DROP CONSTRAINT "StockMovement_userId_fkey";

-- Paso 8: Drop columnas antiguas userId
ALTER TABLE "StockMovement" DROP COLUMN "userId";
ALTER TABLE "DeliveryBatch" DROP COLUMN "userId";
ALTER TABLE "ReturnBatch" DROP COLUMN "userId";
ALTER TABLE "Request" DROP COLUMN "userId";
ALTER TABLE "Approval" DROP COLUMN "userId";
ALTER TABLE "AuditLog" DROP COLUMN "userId";

-- Paso 9: Renombrar newUserId a userId
ALTER TABLE "StockMovement" RENAME COLUMN "newUserId" TO "userId";
ALTER TABLE "DeliveryBatch" RENAME COLUMN "newUserId" TO "userId";
ALTER TABLE "ReturnBatch" RENAME COLUMN "newUserId" TO "userId";
ALTER TABLE "Request" RENAME COLUMN "newUserId" TO "userId";
ALTER TABLE "Approval" RENAME COLUMN "newUserId" TO "userId";
ALTER TABLE "AuditLog" RENAME COLUMN "newUserId" TO "userId";

-- Paso 10: Drop PK antigua de User y columnas obsoletas
ALTER TABLE "User" DROP CONSTRAINT "User_pkey";

-- Paso 11: Drop indices antiguos

-- DropIndex
DROP INDEX IF EXISTS "Collaborator_name_trgm";

-- DropIndex
DROP INDEX IF EXISTS "idx_delivery_date_epp";

-- DropIndex
DROP INDEX IF EXISTS "DeliveryBatch_code_trgm";

-- DropIndex
DROP INDEX IF EXISTS "idx_delivery_batch_date_warehouse";

-- DropIndex
DROP INDEX IF EXISTS "EPP_code_trgm";

-- DropIndex
DROP INDEX IF EXISTS "EPP_name_trgm";

-- DropIndex
DROP INDEX IF EXISTS "idx_epp_category_name";

-- DropIndex
DROP INDEX IF EXISTS "idx_request_status_date";

-- DropIndex
DROP INDEX IF EXISTS "idx_stock_movement_type_date";

-- DropIndex
DROP INDEX IF EXISTS "User_clerkId_key";

-- DropIndex
DROP INDEX IF EXISTS "User_email_trgm";

-- DropIndex
DROP INDEX IF EXISTS "User_name_idx";

-- DropIndex
DROP INDEX IF EXISTS "User_name_trgm";

-- DropIndex
DROP INDEX IF EXISTS "idx_user_clerk_id";

-- Paso 12: Drop columnas antiguas de User
ALTER TABLE "User" ALTER COLUMN "id" DROP DEFAULT;
DROP SEQUENCE IF EXISTS "User_id_seq";
ALTER TABLE "User" DROP COLUMN IF EXISTS "id";
ALTER TABLE "User" DROP COLUMN IF EXISTS "clerkId";
ALTER TABLE "User" DROP COLUMN IF EXISTS "imageUrl";

-- Paso 13: Renombrar newId a id y establecer como PK
ALTER TABLE "User" RENAME COLUMN "newId" TO "id";
ALTER TABLE "User" ADD CONSTRAINT "User_pkey" PRIMARY KEY ("id");

-- Paso 14: Hacer NOT NULL las columnas necesarias
ALTER TABLE "User" ALTER COLUMN "password" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "password" SET NOT NULL;

ALTER TABLE "StockMovement" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "DeliveryBatch" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "ReturnBatch" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "Request" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "Approval" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "AuditLog" ALTER COLUMN "userId" SET NOT NULL;

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "module" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPermission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "grantedBy" TEXT,

    CONSTRAINT "UserPermission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_name_key" ON "Permission"("name");

-- CreateIndex
CREATE INDEX "Permission_module_idx" ON "Permission"("module");

-- CreateIndex
CREATE INDEX "UserPermission_userId_idx" ON "UserPermission"("userId");

-- CreateIndex
CREATE INDEX "UserPermission_permissionId_idx" ON "UserPermission"("permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "UserPermission_userId_permissionId_key" ON "UserPermission"("userId", "permissionId");

-- CreateIndex
CREATE INDEX "StockMovement_type_createdAt_idx" ON "StockMovement"("type", "createdAt");

-- CreateIndex
CREATE INDEX "StockMovement_userId_createdAt_idx" ON "StockMovement"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPermission" ADD CONSTRAINT "UserPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPermission" ADD CONSTRAINT "UserPermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryBatch" ADD CONSTRAINT "DeliveryBatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnBatch" ADD CONSTRAINT "ReturnBatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Paso 15: Limpiar tabla temporal
DROP TABLE "UserIdMapping";

-- Paso 16: Insertar permisos básicos del sistema
INSERT INTO "Permission" ("id", "name", "description", "module") VALUES
('perm_create_delivery', 'create:delivery', 'Crear entregas de EPP', 'deliveries'),
('perm_update_delivery', 'update:delivery', 'Actualizar entregas de EPP', 'deliveries'),
('perm_delete_delivery', 'delete:delivery', 'Eliminar entregas de EPP', 'deliveries'),
('perm_view_delivery', 'view:delivery', 'Ver entregas de EPP', 'deliveries'),

('perm_create_return', 'create:return', 'Crear devoluciones de EPP', 'returns'),
('perm_update_return', 'update:return', 'Actualizar devoluciones de EPP', 'returns'),
('perm_delete_return', 'delete:return', 'Eliminar devoluciones de EPP', 'returns'),
('perm_view_return', 'view:return', 'Ver devoluciones de EPP', 'returns'),

('perm_create_epp', 'create:epp', 'Crear equipos EPP', 'epps'),
('perm_update_epp', 'update:epp', 'Actualizar equipos EPP', 'epps'),
('perm_delete_epp', 'delete:epp', 'Eliminar equipos EPP', 'epps'),
('perm_view_epp', 'view:epp', 'Ver equipos EPP', 'epps'),

('perm_create_stock', 'create:stock', 'Crear movimientos de stock', 'stock'),
('perm_update_stock', 'update:stock', 'Actualizar movimientos de stock', 'stock'),
('perm_delete_stock', 'delete:stock', 'Eliminar movimientos de stock', 'stock'),
('perm_view_stock', 'view:stock', 'Ver movimientos de stock', 'stock'),

('perm_create_user', 'create:user', 'Crear usuarios', 'users'),
('perm_update_user', 'update:user', 'Actualizar usuarios', 'users'),
('perm_delete_user', 'delete:user', 'Eliminar usuarios', 'users'),
('perm_view_user', 'view:user', 'Ver usuarios', 'users'),
('perm_manage_roles', 'manage:roles', 'Gestionar roles y permisos', 'users'),

('perm_view_reports', 'view:reports', 'Ver reportes', 'reports'),
('perm_export_reports', 'export:reports', 'Exportar reportes', 'reports'),

('perm_view_audit', 'view:audit', 'Ver logs de auditoría', 'audit'),
('perm_export_audit', 'export:audit', 'Exportar logs de auditoría', 'audit'),

('perm_manage_settings', 'manage:settings', 'Gestionar configuración del sistema', 'settings');
