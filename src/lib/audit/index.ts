/**
 * Migración del Sistema de Auditoría Optimizado
 * 
 * Actualiza las acciones existentes para usar el logger optimizado
 * con mejor performance y batching automático.
 */

import { 
  optimizedAuditCreate, 
  optimizedAuditUpdate, 
  optimizedAuditDelete 
} from './optimized-logger';

// Re-exportar con nombres compatibles para migración gradual
export const auditCreate = optimizedAuditCreate;
export const auditUpdate = optimizedAuditUpdate;
export const auditDelete = optimizedAuditDelete;

// También exportar el logger original por si se necesita
export { 
  auditCreate as originalAuditCreate,
  auditUpdate as originalAuditUpdate,
  auditDelete as originalAuditDelete
} from './logger';

// Estadísticas para comparar performance
export { getOptimizedLoggerStats, forceFlushOptimizedLogs } from './optimized-logger';