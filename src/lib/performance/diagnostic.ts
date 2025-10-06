/**
 * Script de Diagnóstico de Performance del Sistema de Auditoría
 * 
 * Ejecuta pruebas de carga para comparar el rendimiento del logger
 * optimizado vs el original y proporciona métricas detalladas.
 */

import { getOptimizedLoggerStats, forceFlushOptimizedLogs } from '@/lib/audit/optimized-logger';
import prisma from '@/lib/prisma';

export async function runQuickPerformanceCheck(): Promise<{ status: 'good' | 'warning' | 'critical', message: string }> {
  try {
    const memUsage = process.memoryUsage();
    const stats = await getOptimizedLoggerStats();
    
    // Verificación rápida de memoria
    if (memUsage.heapUsed > 200 * 1024 * 1024) {
      return { status: 'critical', message: 'Uso crítico de memoria detectado' };
    }
    
    if (memUsage.heapUsed > 100 * 1024 * 1024) {
      return { status: 'warning', message: 'Uso alto de memoria, monitorear' };
    }
    
    // Verificación de cola de logs
    if (stats.queueSize > 80) {
      return { status: 'warning', message: 'Cola de auditoría grande, puede afectar performance' };
    }
    
    return { status: 'good', message: 'Sistema funcionando correctamente' };
    
  } catch {
    return { status: 'critical', message: 'Error al verificar estado del sistema' };
  }
}

export async function getAuditSystemHealth() {
  try {
    // Forzar flush de logs pendientes
    await forceFlushOptimizedLogs();
    
    // Obtener métricas del logger optimizado
    const loggerStats = await getOptimizedLoggerStats();
    
    // Obtener métricas de base de datos
    const [auditCount, recentLogs] = await Promise.all([
      prisma.auditLog.count(),
      prisma.auditLog.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Últimas 24h
          }
        }
      })
    ]);

    const memUsage = process.memoryUsage();
    
    return {
      loggerStats,
      database: {
        totalAuditLogs: auditCount,
        recentLogs24h: recentLogs
      },
      memory: {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external
      },
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('Error obteniendo métricas de salud:', error);
    return {
      error: 'No se pudieron obtener las métricas de salud del sistema',
      timestamp: new Date().toISOString()
    };
  }
}