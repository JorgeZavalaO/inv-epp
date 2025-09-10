-- DropIndex (safe)
DROP INDEX IF EXISTS "Collaborator_name_trgm";

-- DropIndex (safe)
DROP INDEX IF EXISTS "DeliveryBatch_code_trgm";

-- DropIndex (safe)
DROP INDEX IF EXISTS "EPP_code_trgm";

-- DropIndex (safe)
DROP INDEX IF EXISTS "EPP_name_trgm";

-- DropIndex (safe)
DROP INDEX IF EXISTS "User_email_trgm";

-- DropIndex (safe)
DROP INDEX IF EXISTS "User_name_trgm";

-- CreateIndex
CREATE INDEX "Collaborator_location_idx" ON "Collaborator"("location");

-- CreateIndex
CREATE INDEX "Delivery_createdAt_idx" ON "Delivery"("createdAt");

-- CreateIndex
CREATE INDEX "DeliveryBatch_warehouseId_idx" ON "DeliveryBatch"("warehouseId");

-- CreateIndex
CREATE INDEX "ReturnItem_createdAt_idx" ON "ReturnItem"("createdAt");

-- CreateIndex
CREATE INDEX "User_name_idx" ON "User"("name");
