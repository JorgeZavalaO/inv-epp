/**
 * Configuración del Sistema de Auditoría
 * 
 * Define qué entidades se auditan y por cuánto tiempo se retienen los logs.
 * La retención automática previene el crecimiento descontrolado de la base de datos.
 */

export interface EntityAuditConfig {
  enabled: boolean;
  retention: number; // Días que se retienen los logs
}

/**
 * Configuración de auditoría por entidad
 * 
 * CRÍTICO (730 días = 2 años):
 * - Entregas y devoluciones: Por regulaciones y compliance
 * - Movimientos de stock: Trazabilidad financiera
 * 
 * IMPORTANTE (180 días = 6 meses):
 * - EPPs y colaboradores: Cambios menos críticos
 * - Almacenes: Configuración del sistema
 * 
 * NO AUDITAR:
 * - User, SystemConfig: Cambios muy frecuentes o poco relevantes
 */
export const AUDITABLE_ENTITIES: Record<string, EntityAuditConfig> = {
  // === CRÍTICO - Retención 2 años ===
  DeliveryBatch: {
    enabled: true,
    retention: 730, // 2 años
  },
  Delivery: {
    enabled: true,
    retention: 730,
  },
  ReturnBatch: {
    enabled: true,
    retention: 730,
  },
  ReturnItem: {
    enabled: true,
    retention: 730,
  },
  StockMovement: {
    enabled: true,
    retention: 365, // 1 año
  },
  EPPStock: {
    enabled: true,
    retention: 365,
  },

  // === IMPORTANTE - Retención 6 meses ===
  EPP: {
    enabled: true,
    retention: 180,
  },
  Collaborator: {
    enabled: true,
    retention: 180,
  },
  Warehouse: {
    enabled: true,
    retention: 180,
  },
  Request: {
    enabled: true,
    retention: 180,
  },
  Approval: {
    enabled: true,
    retention: 180,
  },

  // === NO AUDITAR ===
  User: {
    enabled: false,
    retention: 0,
  },
  SystemConfig: {
    enabled: false,
    retention: 0,
  },
};

/**
 * Acciones que se auditan
 * 
 * READ está deshabilitado porque genera demasiado volumen
 * y generalmente no es necesario para auditoría.
 */
export const AUDITABLE_ACTIONS = {
  CREATE: true,
  UPDATE: true,
  DELETE: true,
  READ: false, // ❌ Demasiado volumen, no se recomienda
} as const;

/**
 * Campos sensibles que NO se deben incluir en los logs
 */
export const SENSITIVE_FIELDS = [
  'password',
  'passwordHash',
  'token',
  'apiKey',
  'secret',
  'creditCard',
  'ssn',
] as const;

/**
 * Configuración de limpieza automática
 */
export const CLEANUP_CONFIG = {
  enabled: true,
  runDaily: true, // Ejecutar job de limpieza diariamente
  batchSize: 1000, // Eliminar en lotes de 1000 para no bloquear
};

/**
 * Verifica si una entidad debe ser auditada
 */
export function isAuditable(entityType: string): boolean {
  const config = AUDITABLE_ENTITIES[entityType];
  return config ? config.enabled : false;
}

/**
 * Obtiene los días de retención para una entidad
 */
export function getRetentionDays(entityType: string): number {
  const config = AUDITABLE_ENTITIES[entityType];
  return config ? config.retention : 0;
}

/**
 * Calcula la fecha de expiración para un log
 */
export function calculateExpirationDate(entityType: string): Date {
  const retentionDays = getRetentionDays(entityType);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + retentionDays);
  return expiresAt;
}
