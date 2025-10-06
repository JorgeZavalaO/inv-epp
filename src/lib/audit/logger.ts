/**
 * Sistema de Logging de Auditoría
 * 
 * Registra cambios en las entidades del sistema de forma asíncrona
 * para no bloquear las operaciones principales.
 * 
 * Características:
 * - Logging asíncrono (no bloquea operaciones)
 * - Solo guarda cambios reales (optimizado)
 * - Filtra campos sensibles
 * - Calcula expiración automática
 * - Captura metadata (IP, userAgent)
 */

import prisma from '@/lib/prisma';
import {
  isAuditable,
  calculateExpirationDate,
  SENSITIVE_FIELDS,
} from './config';

type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

export interface AuditLogInput {
  userId: string; // Actualizado para Auth.js
  action: AuditAction;
  entityType: string;
  entityId: number;
  oldValues?: AnyRecord | null;
  newValues?: AnyRecord | null;
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    location?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  };
}

/**
 * Crea un log de auditoría de forma asíncrona
 * 
 * No espera a que se complete la escritura en DB para no bloquear
 * la operación principal del usuario.
 */
export async function createAuditLog(input: AuditLogInput): Promise<void> {
  // Verificar si la entidad debe auditarse
  if (!isAuditable(input.entityType)) {
    return;
  }

  // Calcular cambios reales
  const changes = calculateChanges(input.oldValues, input.newValues);

  // Si no hay cambios significativos, no registrar
  if (!changes || Object.keys(changes).length === 0) {
    return;
  }

  // Calcular fecha de expiración según tipo de entidad
  const expiresAt = calculateExpirationDate(input.entityType);

  // Crear log de forma asíncrona (no bloquear operación principal)
  // setImmediate ejecuta en el próximo tick del event loop
  setImmediate(async () => {
    try {
      await prisma.auditLog.create({
        data: {
          userId: input.userId,
          action: input.action,
          entityType: input.entityType,
          entityId: input.entityId,
          changes: JSON.stringify(changes),
          metadata: input.metadata ? filterSensitiveData(input.metadata) : undefined,
          expiresAt,
        },
      });
    } catch (error) {
      // Log error pero no fallar la operación principal
      console.error('[Audit] Error creating audit log:', error);
      // En producción, podrías enviar esto a un servicio de logging
    }
  });
}

/**
 * Calcula solo los cambios entre dos objetos
 * 
 * En lugar de guardar objetos completos (que pueden ser grandes),
 * solo guardamos los campos que cambiaron.
 * 
 * Ejemplo:
 * oldValues: { name: "Juan", age: 30, city: "Lima" }
 * newValues: { name: "Juan", age: 31, city: "Lima" }
 * 
 * Resultado: { age: { from: 30, to: 31 } }
 */
function calculateChanges(
  oldValues: AnyRecord | null | undefined,
  newValues: AnyRecord | null | undefined
): AnyRecord | null {
  // Caso CREATE: no hay valores anteriores
  if (!oldValues && newValues) {
    return filterSensitiveData(newValues);
  }

  // Caso DELETE: no hay valores nuevos
  if (oldValues && !newValues) {
    return filterSensitiveData(oldValues);
  }

  // Caso UPDATE: comparar y encontrar diferencias
  if (oldValues && newValues) {
    const changes: AnyRecord = {};

    // Comparar cada campo
    for (const key in newValues) {
      // Ignorar campos sensibles
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (SENSITIVE_FIELDS.includes(key as any)) {
        continue;
      }

      // Comparar valores (usar JSON.stringify para objetos)
      const oldValue = oldValues[key];
      const newValue = newValues[key];

      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes[key] = {
          from: oldValue,
          to: newValue,
        };
      }
    }

    // Verificar campos que fueron eliminados
    for (const key in oldValues) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!(key in newValues) && !SENSITIVE_FIELDS.includes(key as any)) {
        changes[key] = {
          from: oldValues[key],
          to: null,
        };
      }
    }

    return Object.keys(changes).length > 0 ? changes : null;
  }

  return null;
}

/**
 * Filtra campos sensibles de un objeto
 */
function filterSensitiveData(data: AnyRecord): AnyRecord {
  const filtered: AnyRecord = {};

  for (const key in data) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!SENSITIVE_FIELDS.includes(key as any)) {
      filtered[key] = data[key];
    }
  }

  return filtered;
}

/**
 * Helper para auditar una operación CREATE
 */
export async function auditCreate(
  userId: string,
  entityType: string,
  entityId: number,
  values: AnyRecord,
  metadata?: AuditLogInput['metadata']
): Promise<void> {
  return createAuditLog({
    userId,
    action: 'CREATE',
    entityType,
    entityId,
    newValues: values,
    metadata,
  });
}

/**
 * Helper para auditar una operación UPDATE
 */
export async function auditUpdate(
  userId: string,
  entityType: string,
  entityId: number,
  oldValues: AnyRecord,
  newValues: AnyRecord,
  metadata?: AuditLogInput['metadata']
): Promise<void> {
  return createAuditLog({
    userId,
    action: 'UPDATE',
    entityType,
    entityId,
    oldValues,
    newValues,
    metadata,
  });
}

/**
 * Helper para auditar una operación DELETE
 */
export async function auditDelete(
  userId: string,
  entityType: string,
  entityId: number,
  values: AnyRecord,
  metadata?: AuditLogInput['metadata']
): Promise<void> {
  return createAuditLog({
    userId,
    action: 'DELETE',
    entityType,
    entityId,
    oldValues: values,
    metadata,
  });
}

/**
 * Obtiene logs de auditoría para una entidad específica
 */
export async function getAuditLogs(
  entityType: string,
  entityId: number,
  options?: {
    limit?: number;
    offset?: number;
  }
) {
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;

  return prisma.auditLog.findMany({
    where: {
      entityType,
      entityId,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limit,
    skip: offset,
  });
}

/**
 * Obtiene logs de auditoría por usuario
 */
export async function getUserAuditLogs(
  userId: string,
  options?: {
    limit?: number;
    offset?: number;
    entityType?: string;
  }
) {
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;

  return prisma.auditLog.findMany({
    where: {
      userId,
      ...(options?.entityType && { entityType: options.entityType }),
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limit,
    skip: offset,
  });
}
