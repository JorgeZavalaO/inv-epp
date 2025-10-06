import { NextRequest, NextResponse } from 'next/server';
import { analyzePerformance, benchmarkAuditOperations, detectMemoryLeaks } from '@/lib/performance/audit-analyzer';
import { getAuditSystemHealth } from '@/lib/performance/diagnostic';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeBeanchmark = searchParams.get('benchmark') === 'true';

    console.log('🔍 Iniciando análisis de performance del sistema de auditoría...');

    // Análisis de métricas
    const metrics = await analyzePerformance();
    
    // Obtener métricas de salud del sistema
    const systemHealth = await getAuditSystemHealth();
    
    // Detección de memory leaks
    const memoryAnalysis = detectMemoryLeaks();

    // Benchmark opcional (más costoso)
    let benchmarkResults = null;
    if (includeBeanchmark) {
      benchmarkResults = await benchmarkAuditOperations();
    }

    // Cálculos adicionales
    const auditFrequency = metrics.logsLastHour > 0 ? metrics.logsLastHour / 60 : 0; // logs por minuto
    const growthRate = metrics.logsLastDay > 0 ? (metrics.logsLastHour / metrics.logsLastDay) * 24 : 0; // proyección diaria

    // Análisis de salud
    const healthScore = calculateHealthScore(metrics, memoryAnalysis);
    
    // Recomendaciones
    const recommendations = generateRecommendations(metrics, memoryAnalysis, healthScore);

    return NextResponse.json({
      ...systemHealth,
      timestamp: new Date().toISOString(),
      healthScore,
      summary: {
        totalLogs: metrics.totalAuditLogs,
        averageLogSize: `${(metrics.averageLogSize / 1024).toFixed(2)} KB`,
        logsPerMinute: auditFrequency.toFixed(2),
        projectedDailyGrowth: growthRate.toFixed(2),
        memoryUsage: `${metrics.memoryUsage.heapUsed}/${metrics.memoryUsage.heapTotal} MB`,
        status: healthScore >= 80 ? '🟢 Excelente' : healthScore >= 60 ? '🟡 Aceptable' : '🔴 Requiere atención'
      },
      metrics,
      memoryAnalysis,
      benchmarkResults,
      recommendations,
      actions: {
        cleanup: metrics.totalAuditLogs > 10000 ? 'Considerar ejecutar limpieza manual' : null,
        optimization: healthScore < 70 ? 'Revisar configuración de auditoría' : null,
        monitoring: 'Configurar alertas de memoria si usage > 150MB'
      }
    });

  } catch (error) {
    console.error('Error en análisis de performance:', error);
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

function calculateHealthScore(
  metrics: Awaited<ReturnType<typeof analyzePerformance>>,
  memoryAnalysis: ReturnType<typeof detectMemoryLeaks>
): number {
  let score = 100;

  // Penalizar por alto volumen de logs
  if (metrics.totalAuditLogs > 50000) score -= 20;
  else if (metrics.totalAuditLogs > 20000) score -= 10;

  // Penalizar por logs muy grandes
  if (metrics.averageLogSize > 5000) score -= 15; // >5KB promedio
  else if (metrics.averageLogSize > 2000) score -= 8; // >2KB promedio

  // Penalizar por alta frecuencia
  if (metrics.logsLastHour > 500) score -= 15;
  else if (metrics.logsLastHour > 200) score -= 8;

  // Penalizar por uso de memoria
  if (metrics.memoryUsage.heapUsed > 150) score -= 20;
  else if (metrics.memoryUsage.heapUsed > 100) score -= 10;

  // Penalizar por memory leaks sospechosos
  if (memoryAnalysis.suspiciousGrowth) score -= 25;

  return Math.max(0, Math.min(100, score));
}

function generateRecommendations(
  metrics: Awaited<ReturnType<typeof analyzePerformance>>,
  memoryAnalysis: ReturnType<typeof detectMemoryLeaks>,
  healthScore: number
): string[] {
  const recommendations: string[] = [];

  // Recomendaciones basadas en métricas
  if (metrics.totalAuditLogs > 50000) {
    recommendations.push('🧹 Ejecutar limpieza de logs expirados para liberar espacio');
  }

  if (metrics.averageLogSize > 3000) {
    recommendations.push('📦 Los logs son muy grandes. Considerar filtrar más campos o reducir metadata');
  }

  if (metrics.logsLastHour > 300) {
    recommendations.push('⚡ Muy alta frecuencia de logs. Considerar deshabilitar auditoría para entidades no críticas');
  }

  // Recomendaciones de memoria
  if (metrics.memoryUsage.heapUsed > 120) {
    recommendations.push('🧠 Alto uso de memoria. Considerar reiniciar el servicio o optimizar queries');
  }

  // Recomendaciones basadas en patrones
  const topEntityType = metrics.slowestOperations[0];
  if (topEntityType && topEntityType.count > metrics.totalAuditLogs * 0.5) {
    recommendations.push(`🎯 El ${topEntityType.count}% de logs son de ${topEntityType.entityType}. Considerar optimizar esta entidad específicamente`);
  }

  // Logs muy grandes individuales
  const largestLog = metrics.largestLogs[0];
  if (largestLog && largestLog.changesSize > 10000) {
    recommendations.push(`📊 Log muy grande detectado (${(largestLog.changesSize / 1024).toFixed(1)}KB) en ${largestLog.entityType}. Revisar qué datos se están guardando`);
  }

  // Recomendaciones de memory leaks
  recommendations.push(...memoryAnalysis.recommendations);

  // Recomendaciones generales según health score
  if (healthScore < 50) {
    recommendations.push('🚨 Sistema de auditoría impactando significativamente la performance. Considerar deshabilitar temporalmente');
  } else if (healthScore < 70) {
    recommendations.push('⚠️ Performance degradada. Revisar configuración y optimizar queries');
  } else if (healthScore >= 90) {
    recommendations.push('✅ Sistema de auditoría funcionando óptimamente');
  }

  return recommendations;
}