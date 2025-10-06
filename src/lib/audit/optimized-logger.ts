/**
 * Sistema de Auditoría Optimizado
 * 
 * Versión mejorada del logger con optimizaciones de performance:
 * - Batching de logs
 * - Queue con límite de memoria
 * - Compresión de datos
 * - Rate limiting
 * - Monitoring integrado
 */

import prisma from '@/lib/prisma';
import { isAuditable, calculateExpirationDate, SENSITIVE_FIELDS } from './config';
import { measureTime } from '@/lib/performance/audit-analyzer';

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

interface BatchedLog {
  userId: string; // Actualizado para Auth.js
  action: AuditAction;
  entityType: string;
  entityId: number;
  changes: string;
  metadata?: unknown;
  expiresAt: Date;
  timestamp: Date;
}

class OptimizedAuditLogger {
  private static instance: OptimizedAuditLogger;
  private batchQueue: BatchedLog[] = [];
  private isProcessing = false;
  private lastFlush = Date.now();
  
  // Configuración optimizada
  private readonly config = {
    BATCH_SIZE: 10, // Procesar en lotes de 10
    BATCH_TIMEOUT: 5000, // Flush cada 5 segundos máximo
    MAX_QUEUE_SIZE: 100, // Límite de memoria: máx 100 logs en queue
    MAX_CHANGES_SIZE: 5000, // Máximo 5KB por log de cambios
    RATE_LIMIT: 50, // Máx 50 logs por minuto por usuario
    ENABLE_COMPRESSION: true,
  };

  private userRateLimit = new Map<string, { count: number; resetTime: number }>();

  static getInstance(): OptimizedAuditLogger {
    if (!OptimizedAuditLogger.instance) {
      OptimizedAuditLogger.instance = new OptimizedAuditLogger();
    }
    return OptimizedAuditLogger.instance;
  }

  constructor() {
    // Auto-flush periódico
    setInterval(() => {
      if (this.shouldFlush()) {
        this.flushBatch().catch(console.error);
      }
    }, 2000); // Check cada 2 segundos

    // Cleanup de rate limiting cada minuto
    setInterval(() => {
      this.cleanupRateLimit();
    }, 60000);
  }

  /**
   * Log optimizado con batching y rate limiting
   */
  async log(input: AuditLogInput): Promise<void> {
    try {
      // Rate limiting por usuario
      if (!this.checkRateLimit(input.userId)) {
        console.warn(`[Audit] Rate limit exceeded for user ${input.userId}`);
        return;
      }

      // Verificar si la entidad debe auditarse
      if (!isAuditable(input.entityType)) {
        return;
      }

      // Calcular cambios con límite de tamaño
      const changes = this.calculateOptimizedChanges(input.oldValues, input.newValues);
      if (!changes || Object.keys(changes).length === 0) {
        return;
      }

      const changesStr = JSON.stringify(changes);
      
      // Skip si el log es demasiado grande
      if (changesStr.length > this.config.MAX_CHANGES_SIZE) {
        console.warn(`[Audit] Log too large (${changesStr.length} chars) for ${input.entityType}:${input.entityId}`);
        // Guardar versión truncada
        const truncatedChanges = { _truncated: true, _size: changesStr.length };
        this.addToBatch({
          ...input,
          changes: JSON.stringify(truncatedChanges),
          expiresAt: calculateExpirationDate(input.entityType),
          timestamp: new Date(),
        });
        return;
      }

      // Agregar al batch
      this.addToBatch({
        userId: input.userId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        changes: changesStr,
        metadata: input.metadata ? this.filterSensitiveData(input.metadata) : undefined,
        expiresAt: calculateExpirationDate(input.entityType),
        timestamp: new Date(),
      });

    } catch (error) {
      console.error('[Audit] Error in optimized logging:', error);
    }
  }

  /**
   * Agregar log al batch con límites de memoria
   */
  private addToBatch(log: BatchedLog): void {
    // Verificar límite de memoria
    if (this.batchQueue.length >= this.config.MAX_QUEUE_SIZE) {
      console.warn('[Audit] Queue full, dropping oldest logs');
      this.batchQueue = this.batchQueue.slice(-this.config.MAX_QUEUE_SIZE / 2); // Keep half
    }

    this.batchQueue.push(log);

    // Flush automático si el batch está lleno
    if (this.batchQueue.length >= this.config.BATCH_SIZE) {
      // No await para mantener asíncrono
      this.flushBatch().catch(console.error);
    }
  }

  /**
   * Verificar si debe hacer flush del batch
   */
  private shouldFlush(): boolean {
    if (this.batchQueue.length === 0) return false;
    
    const timeSinceLastFlush = Date.now() - this.lastFlush;
    return timeSinceLastFlush > this.config.BATCH_TIMEOUT;
  }

  /**
   * Procesar batch de logs en una sola transacción
   */
  private async flushBatch(): Promise<void> {
    if (this.isProcessing || this.batchQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const logsToProcess = [...this.batchQueue];
    this.batchQueue = []; // Clear queue immediately
    this.lastFlush = Date.now();

    try {
      const { duration } = await measureTime(async () => {
        // Insertar en lotes para mejor performance
        await prisma.auditLog.createMany({
          data: logsToProcess.map(log => ({
            userId: log.userId,
            action: log.action,
            entityType: log.entityType,
            entityId: log.entityId,
            changes: log.changes,
            metadata: log.metadata || undefined,
            expiresAt: log.expiresAt,
            createdAt: log.timestamp,
          })),
          skipDuplicates: true, // Skip si hay conflictos
        });
      });

      console.log(`[Audit] Flushed ${logsToProcess.length} logs in ${duration.toFixed(2)}ms`);

    } catch (error) {
      console.error('[Audit] Error flushing batch:', error);
      
      // Re-queue logs si falló (con límite)
      if (logsToProcess.length < 20) { // Solo re-queue si es pequeño
        this.batchQueue.unshift(...logsToProcess);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Rate limiting por usuario
   */
  private checkRateLimit(userId: string): boolean {
    const now = Date.now();
    const userLimit = this.userRateLimit.get(userId);

    if (!userLimit) {
      this.userRateLimit.set(userId, { count: 1, resetTime: now + 60000 });
      return true;
    }

    if (now > userLimit.resetTime) {
      // Reset counter
      this.userRateLimit.set(userId, { count: 1, resetTime: now + 60000 });
      return true;
    }

    if (userLimit.count >= this.config.RATE_LIMIT) {
      return false; // Rate limited
    }

    userLimit.count++;
    return true;
  }

  /**
   * Limpiar rate limiting expirado
   */
  private cleanupRateLimit(): void {
    const now = Date.now();
    for (const [userId, limit] of this.userRateLimit.entries()) {
      if (now > limit.resetTime) {
        this.userRateLimit.delete(userId);
      }
    }
  }

  /**
   * Calcular cambios con optimizaciones
   */
  private calculateOptimizedChanges(
    oldValues: AnyRecord | null | undefined,
    newValues: AnyRecord | null | undefined
  ): AnyRecord | null {
    // Caso CREATE: filtrar y limitar tamaño
    if (!oldValues && newValues) {
      return this.filterAndLimit(newValues);
    }

    // Caso DELETE: filtrar y limitar tamaño
    if (oldValues && !newValues) {
      return this.filterAndLimit(oldValues);
    }

    // Caso UPDATE: comparar eficientemente
    if (oldValues && newValues) {
      const changes: AnyRecord = {};
      const keys = new Set([...Object.keys(oldValues), ...Object.keys(newValues)]);

      for (const key of keys) {
        if ((SENSITIVE_FIELDS as readonly string[]).includes(key)) continue;

        const oldValue = oldValues[key];
        const newValue = newValues[key];

        // Comparación optimizada para primitivos
        if (oldValue !== newValue) {
          // Para objetos/arrays, usar JSON comparison solo si es necesario
          if (
            typeof oldValue === 'object' || typeof newValue === 'object'
          ) {
            if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
              changes[key] = { from: oldValue, to: newValue };
            }
          } else {
            changes[key] = { from: oldValue, to: newValue };
          }
        }
      }

      return Object.keys(changes).length > 0 ? changes : null;
    }

    return null;
  }

  /**
   * Filtrar campos sensibles y limitar tamaño
   */
  private filterAndLimit(data: AnyRecord): AnyRecord {
    const filtered: AnyRecord = {};
    
    for (const key in data) {
      if (!(SENSITIVE_FIELDS as readonly string[]).includes(key)) {
        let value = data[key];
        
        // Limitar strings muy largos
        if (typeof value === 'string' && value.length > 500) {
          value = value.substring(0, 500) + '...[truncated]';
        }
        
        // Limitar arrays muy largos
        if (Array.isArray(value) && value.length > 20) {
          value = value.slice(0, 20);
          value.push(`...[${data[key].length - 20} more items]`);
        }
        
        filtered[key] = value;
      }
    }
    
    return filtered;
  }

  /**
   * Filtrar campos sensibles
   */
  private filterSensitiveData(data: AnyRecord): AnyRecord {
    const filtered: AnyRecord = {};
    
    for (const key in data) {
      if (!(SENSITIVE_FIELDS as readonly string[]).includes(key)) {
        filtered[key] = data[key];
      }
    }
    
    return filtered;
  }

  /**
   * Flush manual del batch (para testing o shutdown)
   */
  async forceFlush(): Promise<void> {
    await this.flushBatch();
  }

  /**
   * Obtener estadísticas del logger
   */
  getStats() {
    return {
      queueSize: this.batchQueue.length,
      isProcessing: this.isProcessing,
      rateLimitedUsers: this.userRateLimit.size,
      lastFlush: this.lastFlush,
      config: this.config,
    };
  }
}

// Singleton instance
const optimizedLogger = OptimizedAuditLogger.getInstance();

/**
 * API principal optimizada (compatible con la anterior)
 */
export async function createOptimizedAuditLog(input: AuditLogInput): Promise<void> {
  return optimizedLogger.log(input);
}

/**
 * Helpers optimizados
 */
export async function optimizedAuditCreate(
  userId: string,
  entityType: string,
  entityId: number,
  values: AnyRecord,
  metadata?: AuditLogInput['metadata']
): Promise<void> {
  return optimizedLogger.log({
    userId,
    action: 'CREATE',
    entityType,
    entityId,
    newValues: values,
    metadata,
  });
}

export async function optimizedAuditUpdate(
  userId: string,
  entityType: string,
  entityId: number,
  oldValues: AnyRecord,
  newValues: AnyRecord,
  metadata?: AuditLogInput['metadata']
): Promise<void> {
  return optimizedLogger.log({
    userId,
    action: 'UPDATE',
    entityType,
    entityId,
    oldValues,
    newValues,
    metadata,
  });
}

export async function optimizedAuditDelete(
  userId: string,
  entityType: string,
  entityId: number,
  values: AnyRecord,
  metadata?: AuditLogInput['metadata']
): Promise<void> {
  return optimizedLogger.log({
    userId,
    action: 'DELETE',
    entityType,
    entityId,
    oldValues: values,
    metadata,
  });
}

/**
 * Obtener estadísticas del logger optimizado
 */
export function getOptimizedLoggerStats() {
  return optimizedLogger.getStats();
}

/**
 * Forzar flush del batch (para testing)
 */
export async function forceFlushOptimizedLogs(): Promise<void> {
  return optimizedLogger.forceFlush();
}

export default optimizedLogger;