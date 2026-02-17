-- Investigar devoluciones sospechosas
-- Para DEL-0200 (warehouseId=14) y DEL-0199 (warehouseId=14)

-- 1) Ver TODAS las devoluciones registradas para los EPPs de estas entregas
SELECT 
  rb.id as return_batch_id,
  rb.code as return_code,
  rb."warehouseId",
  rb."createdAt" as return_fecha,
  rb."userId" as created_by_user_id,
  u.name as user_name,
  u.email as user_email,
  rb.note,
  rb.condition,
  COUNT(ri.id) as item_count,
  SUM(ri.quantity) as total_quantity_returned,
  STRING_AGG(DISTINCT ri."eppId"::text, ', ') as epp_ids
FROM "ReturnBatch" rb
LEFT JOIN "User" u ON rb."userId" = u.id
JOIN "ReturnItem" ri ON rb.id = ri."batchId"
WHERE rb."warehouseId" = 14 
  AND ri."eppId" IN (66, 29, 95, 20, 33, 27)
GROUP BY rb.id, rb.code, rb."warehouseId", rb."createdAt", rb."userId", u.name, u.email, rb.note, rb.condition
ORDER BY rb."createdAt" DESC;

-- 2) Detalle de CADA devolución con los EPPs específicos
SELECT 
  rb.id as return_batch_id,
  rb.code as return_code,
  rb."createdAt",
  u.name as created_by,
  u.email,
  ri."eppId",
  e.code as epp_code,
  e.name as epp_name,
  ri.quantity as returned_qty
FROM "ReturnBatch" rb
LEFT JOIN "User" u ON rb."userId" = u.id
JOIN "ReturnItem" ri ON rb.id = ri."batchId"
LEFT JOIN "Epp" e ON ri."eppId" = e.id
WHERE rb."warehouseId" = 14 
  AND ri."eppId" IN (66, 29, 95, 20, 33, 27)
ORDER BY rb."createdAt" DESC, ri."eppId";

-- 3) Verificar si hay un campo de batchId (delivery batch) en ReturnBatch
-- (para saber si están vinculadas a DEL-0200 o DEL-0199)
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'ReturnBatch'
ORDER BY ordinal_position;

-- 4) Si existe el campo, mostrar la relación
-- (descomentar si el campo existe)
-- SELECT 
--   rb.id, rb.code, rb."batchId", db.code as delivery_batch_code
-- FROM "ReturnBatch" rb
-- LEFT JOIN "DeliveryBatch" db ON rb."batchId" = db.id
-- WHERE rb."warehouseId" = 14
-- ORDER BY rb."createdAt" DESC;
