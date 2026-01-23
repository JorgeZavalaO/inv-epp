/**
 * Script para generar reporte SQL de movimientos problemáticos
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function generateSQLReport() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📊 REPORTE SQL PARA CORRECCIÓN');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    // 1. Identificar movimientos sin entrega
    console.log('-- ═════════════════════════════════════════════════════');
    console.log('-- 1. MOVIMIENTOS HUÉRFANOS (sin entrega correspondiente)');
    console.log('-- ═════════════════════════════════════════════════════\n');

    console.log(`SELECT 
  sm.id as movement_id,
  sm.eppId,
  sm.warehouseId,
  sm.quantity,
  sm.note,
  sm.createdAt,
  sm.status,
  (SELECT COUNT(*) FROM "Delivery" d 
   WHERE d.eppId = sm.eppId 
   AND d."batchId" IN (
     SELECT id FROM "DeliveryBatch" 
     WHERE "warehouseId" = sm.warehouseId
   )
  ) as matching_deliveries
FROM "StockMovement" sm
WHERE sm.type = 'EXIT'
  AND sm.note LIKE 'Entrega %'
  AND NOT EXISTS (
    SELECT 1 FROM "Delivery" d
    INNER JOIN "DeliveryBatch" db ON d."batchId" = db.id
    WHERE d.eppId = sm.eppId
      AND db."warehouseId" = sm.warehouseId
      AND db.code = SUBSTRING(sm.note, POSITION(' ' IN sm.note) + 1, 20)
  )
ORDER BY sm.createdAt DESC;\n`);

    // 2. Lotes con discrepancias de cantidad
    console.log('\n-- ═════════════════════════════════════════════════════');
    console.log('-- 2. LOTES CON DISCREPANCIAS DE CANTIDAD');
    console.log('-- ═════════════════════════════════════════════════════\n');

    console.log(`WITH batch_deliveries AS (
  SELECT 
    db.id as batch_id,
    db.code,
    db."warehouseId",
    d.eppId,
    SUM(d.quantity) as total_delivery_qty
  FROM "DeliveryBatch" db
  INNER JOIN "Delivery" d ON d."batchId" = db.id
  GROUP BY db.id, db.code, db."warehouseId", d.eppId
),
batch_movements AS (
  SELECT 
    db.id as batch_id,
    db.code,
    sm.eppId,
    SUM(sm.quantity) as total_movement_qty,
    ARRAY_AGG(
      json_build_object(
        'id', sm.id,
        'qty', sm.quantity,
        'date', sm.createdAt,
        'status', sm.status
      )
    ) as movement_list
  FROM "DeliveryBatch" db
  INNER JOIN "StockMovement" sm ON sm.note LIKE CONCAT('%', db.code, '%')
  WHERE sm.type = 'EXIT'
    AND sm."warehouseId" = db."warehouseId"
  GROUP BY db.id, db.code, sm.eppId
)
SELECT 
  bd.code as batch_code,
  bd.eppId,
  bd.total_delivery_qty,
  bm.total_movement_qty,
  (bd.total_delivery_qty - bm.total_movement_qty) as difference,
  array_length(bm.movement_list, 1) as num_movements,
  bm.movement_list
FROM batch_deliveries bd
FULL OUTER JOIN batch_movements bm 
  ON bd.batch_id = bm.batch_id AND bd.eppId = bm.eppId
WHERE bd.total_delivery_qty != bm.total_movement_qty
ORDER BY bd.code, bd.eppId;\n`);

    // 3. Movimientos potencialmente duplicados
    console.log('\n-- ═════════════════════════════════════════════════════');
    console.log('-- 3. MOVIMIENTOS POTENCIALMENTE DUPLICADOS');
    console.log('-- ═════════════════════════════════════════════════════\n');

    console.log(`WITH movement_groups AS (
  SELECT 
    eppId,
    warehouseId,
    quantity,
    note,
    status,
    COUNT(*) as count,
    ARRAY_AGG(id ORDER BY createdAt) as ids,
    ARRAY_AGG(createdAt ORDER BY createdAt) as dates,
    MAX(createdAt) - MIN(createdAt) as time_span
  FROM "StockMovement"
  WHERE type = 'EXIT'
    AND note LIKE 'Entrega %'
  GROUP BY eppId, warehouseId, quantity, note, status
  HAVING COUNT(*) > 1
)
SELECT 
  mg.eppId,
  mg.warehouseId,
  mg.quantity,
  mg.note,
  mg.count as duplicate_count,
  mg.ids as movement_ids,
  mg.dates as creation_dates,
  EXTRACT(MINUTE FROM mg.time_span) as span_minutes,
  CASE 
    WHEN EXTRACT(MINUTE FROM mg.time_span) < 5 THEN 'LIKELY_DUPLICATE'
    ELSE 'POSSIBLY_RELATED'
  END as classification
FROM movement_groups mg
ORDER BY EXTRACT(MINUTE FROM mg.time_span) ASC;\n`);

    // 4. Estadísticas consolidadas
    console.log('\n-- ═════════════════════════════════════════════════════');
    console.log('-- 4. ESTADÍSTICAS CONSOLIDADAS');
    console.log('-- ═════════════════════════════════════════════════════\n');

    console.log(`SELECT 
  'Total Entregas' as metric,
  COUNT(*) as value
FROM "Delivery"

UNION ALL

SELECT 
  'Total Movimientos EXIT' as metric,
  COUNT(*) as value
FROM "StockMovement"
WHERE type = 'EXIT'

UNION ALL

SELECT 
  'Entregas sin movimiento' as metric,
  COUNT(DISTINCT d.id) as value
FROM "Delivery" d
WHERE NOT EXISTS (
  SELECT 1 FROM "StockMovement" sm
  WHERE sm.type = 'EXIT'
    AND sm.eppId = d.eppId
    AND sm."warehouseId" IN (
      SELECT "warehouseId" FROM "DeliveryBatch" WHERE id = d."batchId"
    )
    AND sm.note LIKE CONCAT('%', (SELECT code FROM "DeliveryBatch" WHERE id = d."batchId"), '%')
)

UNION ALL

SELECT 
  'Movimientos sin entrega' as metric,
  COUNT(*) as value
FROM "StockMovement" sm
WHERE sm.type = 'EXIT'
  AND sm.note LIKE 'Entrega %'
  AND NOT EXISTS (
    SELECT 1 FROM "Delivery" d
    INNER JOIN "DeliveryBatch" db ON d."batchId" = db.id
    WHERE d.eppId = sm.eppId
      AND db."warehouseId" = sm."warehouseId"
      AND db.code = SUBSTRING(sm.note, POSITION(' ' IN sm.note) + 1, 20)
  )

UNION ALL

SELECT 
  'Cantidad total entregada' as metric,
  SUM(quantity)::text as value
FROM "Delivery"

UNION ALL

SELECT 
  'Cantidad total movimientos' as metric,
  SUM(quantity)::text as value
FROM "StockMovement"
WHERE type = 'EXIT';\n`);

    // 5. Scripts de limpieza (con precaución)
    console.log('\n-- ═════════════════════════════════════════════════════');
    console.log('-- 5. SCRIPT DE LIMPIEZA (EJECUTAR CON PRECAUCIÓN)');
    console.log('-- ═════════════════════════════════════════════════════\n');

    console.log(`-- PASO 1: Crear tabla de respaldo
CREATE TABLE "StockMovement_backup_$(date +%Y%m%d)" AS 
SELECT * FROM "StockMovement"
WHERE type = 'EXIT' AND note LIKE 'Entrega %';

-- PASO 2: Identificar movimientos a eliminar (segunda copia)
WITH duplicates AS (
  SELECT 
    id,
    eppId,
    warehouseId,
    quantity,
    note,
    ROW_NUMBER() OVER (
      PARTITION BY eppId, warehouseId, note 
      ORDER BY createdAt ASC
    ) as rn
  FROM "StockMovement"
  WHERE type = 'EXIT' AND note LIKE 'Entrega %'
)
SELECT id FROM duplicates WHERE rn > 1;

-- PASO 3: ANTES DE EJECUTAR ESTO, VERIFICA LOS IDS ARRIBA
-- DELETE FROM "StockMovement" 
-- WHERE id IN (...);\n`);

  } catch (error) {
    console.error('❌ Error:', error);
  }

  console.log('\n═══════════════════════════════════════════════════════════\n');

  await prisma.$disconnect();
}

generateSQLReport().catch(console.error);
