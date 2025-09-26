-- Índices de optimización para mejorar el rendimiento del sistema
-- Ejecutar con: pnpm prisma migrate dev --name performance_indexes

-- 1. Para consultas de entregas por fecha y almacén (Dashboard + Reportes)
CREATE INDEX "idx_delivery_batch_date_warehouse" 
ON "DeliveryBatch" ("createdAt" DESC, "warehouseId");

-- 2. Para consultas de entregas por lote y EPP (Detalles de entrega)
CREATE INDEX "idx_delivery_epp_batch" 
ON "Delivery" ("batchId", "eppId");

-- 3. Para búsquedas de colaboradores por ubicación (Filtros)
CREATE INDEX "idx_collaborator_location_name" 
ON "Collaborator" ("location", "name") WHERE "location" IS NOT NULL;

-- 4. Para reportes de movimientos por tipo y fecha
CREATE INDEX "idx_stock_movement_type_date" 
ON "StockMovement" ("type", "createdAt" DESC);

-- 5. Para consultas de entregas en reportes
CREATE INDEX "idx_delivery_date_epp" 
ON "Delivery" ("createdAt" DESC, "eppId");

-- 6. Para devoluciones por lote y EPP
CREATE INDEX "idx_return_item_batch_epp" 
ON "ReturnItem" ("batchId", "eppId");

-- 7. Para consultas de stock por almacén y EPP (Stock movements)
CREATE INDEX "idx_epp_stock_warehouse_epp" 
ON "EPPStock" ("warehouseId", "eppId") WHERE "quantity" > 0;

-- 8. Para búsquedas de EPPs por categoría y nombre
CREATE INDEX "idx_epp_category_name" 
ON "EPP" ("category", "name");

-- 9. Para solicitudes por estado y fecha
CREATE INDEX "idx_request_status_date" 
ON "Request" ("status", "createdAt" DESC);

-- 10. Para optimizar consultas de usuario por clerkId
CREATE INDEX "idx_user_clerk_id" 
ON "User" ("clerkId");