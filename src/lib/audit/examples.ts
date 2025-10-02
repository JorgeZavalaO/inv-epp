/**
 * Ejemplo de Integración del Sistema de Auditoría
 * 
 * Este archivo muestra cómo integrar el logging de auditoría
 * en las acciones existentes del sistema.
 * 
 * IMPORTANTE: Copiar estos ejemplos a los archivos reales de actions.ts
 */

import { auditCreate, auditUpdate, auditDelete } from '@/lib/audit/logger';
import { ensureClerkUser } from '@/lib/user-sync';

/**
 * EJEMPLO 1: Auditar creación de entrega
 * 
 * Agregar esto al final de createDeliveryBatch en:
 * src/app/(protected)/deliveries/actions.ts
 */
export async function createDeliveryBatchWithAudit() {
  // ... código existente de createDeliveryBatch ...
  
  const operator = await ensureClerkUser();
  const result = { id: 123, code: 'DEL-0001' }; // Tu resultado real
  
  // ✅ AGREGAR ESTO al final, después del commit exitoso:
  await auditCreate(
    operator.id,
    'DeliveryBatch',
    result.id,
    {
      code: result.code,
      collaboratorId: 1, // tu data.collaboratorId
      warehouseId: 1,    // tu data.warehouseId
      note: 'Nota',
      // NO incluir deliveries aquí, se auditan por separado
    },
    {
      ipAddress: '192.168.1.1', // obtener del request si está disponible
      userAgent: 'Mozilla/5.0...',
    }
  );

  return result;
}

/**
 * EJEMPLO 2: Auditar actualización de entrega
 * 
 * Agregar esto a updateDeliveryBatch en:
 * src/app/(protected)/deliveries/actions.ts
 */
export async function updateDeliveryBatchWithAudit() {
  // ... código existente ...
  
  const operator = await ensureClerkUser();
  
  // Capturar valores ANTES de actualizar
  const before = {
    id: 123,
    code: 'DEL-0001',
    collaboratorId: 1,
    warehouseId: 1,
    note: 'Nota original',
  };
  
  // Hacer el update
  const after = {
    ...before,
    collaboratorId: 2, // Cambio
    note: 'Nota actualizada', // Cambio
  };
  
  // ✅ AGREGAR ESTO después del update exitoso:
  await auditUpdate(
    operator.id,
    'DeliveryBatch',
    before.id,
    before, // Valores anteriores
    after,  // Valores nuevos
  );
}

/**
 * EJEMPLO 3: Auditar eliminación de entrega
 * 
 * Agregar esto a deleteBatch en:
 * src/app/(protected)/deliveries/actions.ts
 */
export async function deleteBatchWithAudit() {
  // ... código existente ...
  
  const operator = await ensureClerkUser();
  const batchId = 123;
  
  // Capturar valores ANTES de eliminar
  const batchData = {
    id: batchId,
    code: 'DEL-0001',
    collaboratorId: 1,
    warehouseId: 1,
    note: 'Nota',
  };
  
  // Hacer el delete
  // await prisma.deliveryBatch.delete(...)
  
  // ✅ AGREGAR ESTO después del delete exitoso:
  await auditDelete(
    operator.id,
    'DeliveryBatch',
    batchId,
    batchData, // Valores que se eliminaron
  );
}

/**
 * EJEMPLO 4: Auditar operaciones de EPP
 * 
 * Similar para crear, actualizar o eliminar EPPs:
 */
export async function createEPPWithAudit() {
  const operator = await ensureClerkUser();
  
  const epp = {
    id: 1,
    code: 'EPP-001',
    name: 'Casco de seguridad',
    category: 'Protección de cabeza',
    minStock: 10,
  };
  
  // ... crear EPP en DB ...
  
  // Auditar
  await auditCreate(
    operator.id,
    'EPP',
    epp.id,
    epp
  );
}

/**
 * EJEMPLO 5: Auditar movimientos de stock
 * 
 * Los movimientos de stock son críticos y deben auditarse:
 */
export async function createStockMovementWithAudit() {
  const operator = await ensureClerkUser();
  
  const movement = {
    id: 1,
    type: 'ENTRY',
    eppId: 1,
    warehouseId: 1,
    quantity: 100,
    note: 'Compra de stock',
  };
  
  // ... crear movimiento en DB ...
  
  // Auditar
  await auditCreate(
    operator.id,
    'StockMovement',
    movement.id,
    movement
  );
}

/**
 * NOTAS IMPORTANTES:
 * 
 * 1. El logging es ASÍNCRONO - no bloquea la operación principal
 * 2. Si el audit log falla, NO falla la operación principal
 * 3. Solo se guardan los CAMBIOS, no los objetos completos
 * 4. Campos sensibles se filtran automáticamente
 * 5. Los logs expiran automáticamente según configuración
 */
