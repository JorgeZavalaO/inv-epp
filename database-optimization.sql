-- 🗄️ OPTIMIZACIÓN DE BASE DE DATOS - INV-EPP
-- Ejecutar estos índices para mejorar el rendimiento significativamente

-- ================================================================
-- ÍNDICES COMPUESTOS PARA CONSULTAS FRECUENTES
-- ================================================================

-- 1. Para consultas de entregas por fecha y almacén (Dashboard + Reportes)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_delivery_batch_date_warehouse 
ON "DeliveryBatch" ("createdAt" DESC, "warehouseId");

-- 2. Para consultas de entregas por lote y EPP (Detalles de entrega)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_delivery_epp_batch 
ON "Delivery" ("batchId", "eppId");

-- 3. Para búsquedas de colaboradores por ubicación (Filtros)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_collaborator_location_name 
ON "Collaborator" ("location", "name") WHERE "location" IS NOT NULL;

-- 4. Para reportes de movimientos por tipo y fecha
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stock_movement_type_date 
ON "StockMovement" ("type", "createdAt" DESC);

-- 5. Para consultas de entregas en reportes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_delivery_date_epp 
ON "Delivery" ("createdAt" DESC, "eppId");

-- 6. Para devoluciones por lote y EPP
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_return_item_batch_epp 
ON "ReturnItem" ("batchId", "eppId");

-- 7. Para consultas de stock por almacén y EPP (Stock movements)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_epp_stock_warehouse_epp 
ON "EPPStock" ("warehouseId", "eppId") WHERE "quantity" > 0;

-- 8. Para búsquedas de EPPs por categoría y nombre
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_epp_category_name 
ON "EPP" ("category", "name");

-- 9. Para solicitudes por estado y fecha
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_request_status_date 
ON "Request" ("status", "createdAt" DESC);

-- 10. Para colaboradores activos (que tienen entregas)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_collaborator_active 
ON "Collaborator" ("id") 
WHERE EXISTS (SELECT 1 FROM "DeliveryBatch" db WHERE db."collaboratorId" = "Collaborator"."id");

-- ================================================================
-- ANÁLISIS DE CONSULTAS LENTAS
-- ================================================================

-- Query para identificar consultas lentas (requiere log_statement = 'all')
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows
FROM pg_stat_statements 
WHERE query LIKE '%DeliveryBatch%' OR query LIKE '%Delivery%'
ORDER BY mean_time DESC 
LIMIT 10;

-- ================================================================
-- ESTADÍSTICAS DE ÍNDICES
-- ================================================================

-- Verificar uso de índices
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- ================================================================
-- MANTENIMIENTO DE TABLAS
-- ================================================================

-- Ejecutar ANALYZE después de crear los índices
ANALYZE "DeliveryBatch";
ANALYZE "Delivery";
ANALYZE "Collaborator";
ANALYZE "StockMovement";
ANALYZE "ReturnItem";
ANALYZE "EPPStock";
ANALYZE "EPP";
ANALYZE "Request";

-- ================================================================
-- CONFIGURACIÓN RECOMENDADA DE POSTGRESQL
-- ================================================================

/*
# postgresql.conf - Configuraciones recomendadas para EPP system

# Memoria
shared_buffers = 256MB                  # 25% de RAM disponible
effective_cache_size = 1GB              # 75% de RAM disponible
work_mem = 4MB                          # Para operaciones de ordenamiento
maintenance_work_mem = 64MB             # Para operaciones de mantenimiento

# Escritura
wal_buffers = 16MB
checkpoint_completion_target = 0.9
wal_writer_delay = 200ms

# Consultas
random_page_cost = 1.1                  # Para SSD
effective_io_concurrency = 200          # Para SSD

# Logging (para análisis de performance)
log_statement = 'mod'                   # Log modificaciones
log_min_duration_statement = 1000       # Log consultas > 1s
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '

# Estadísticas
track_activities = on
track_counts = on
track_io_timing = on
track_functions = pl
*/