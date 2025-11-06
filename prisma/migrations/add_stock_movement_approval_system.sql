-- AlterEnum: Agregar nuevo enum MovementStatus
CREATE TYPE "MovementStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable: Agregar columnas de aprobación a StockMovement
ALTER TABLE "StockMovement" 
ADD COLUMN "status" "MovementStatus" NOT NULL DEFAULT 'APPROVED',
ADD COLUMN "approvedById" TEXT,
ADD COLUMN "approvedAt" TIMESTAMP(3),
ADD COLUMN "rejectionNote" TEXT;

-- AddForeignKey: Relación con User (approver)
ALTER TABLE "StockMovement" 
ADD CONSTRAINT "StockMovement_approvedById_fkey" 
FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex: Índice para filtrar por status
CREATE INDEX "StockMovement_status_createdAt_idx" ON "StockMovement"("status", "createdAt");

-- Nota: Los movimientos existentes se marcan como APPROVED por defecto
-- para no afectar el flujo actual del sistema
