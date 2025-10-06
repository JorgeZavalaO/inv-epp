/**
 * Herramienta de Análisis de Performance
 * 
 * Analiza el impacto del sistema de auditoría en el rendimiento
 */

import prisma from '@/lib/prisma';

interface PerformanceMetrics {
  totalAuditLogs: number;
  averageLogSize: number;
  logsLastHour: number;
  logsLastDay: number;
  largestLogs: Array<{
    id: string;
    entityType: string;
    changesSize: number;
    createdAt: Date;
  }>;
  slowestOperations: Array<{
    entityType: string;
    averageTime: number;
    count: number;
  }>;
  memoryUsage: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
}

/**
 * Mide el tiempo de ejecución de una función
 */
export function measureTime<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
  return new Promise(async (resolve) => {
    const start = process.hrtime.bigint();
    try {
      const result = await fn();
      const end = process.hrtime.bigint();
      const duration = Number(end - start) / 1000000; // Convert to milliseconds
      resolve({ result, duration });
    } catch (error) {
      const end = process.hrtime.bigint();
      const duration = Number(end - start) / 1000000;
      throw { error, duration };
    }
  });
}

/**
 * Analiza las métricas de performance del sistema de auditoría
 */
export async function analyzePerformance(): Promise<PerformanceMetrics> {
  console.log('🔍 Iniciando análisis de performance...');

  // Métricas de memoria
  const memoryUsage = process.memoryUsage();

  // Contar total de logs
  const totalAuditLogs = await prisma.auditLog.count();

  // Logs de la última hora
  const oneHourAgo = new Date();
  oneHourAgo.setHours(oneHourAgo.getHours() - 1);
  const logsLastHour = await prisma.auditLog.count({
    where: { createdAt: { gte: oneHourAgo } }
  });

  // Logs del último día
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);
  const logsLastDay = await prisma.auditLog.count({
    where: { createdAt: { gte: oneDayAgo } }
  });

  // Obtener logs más grandes (por tamaño de JSON)
  const largestLogs = await prisma.$queryRaw<Array<{
    id: string;
    entityType: string;
    changesSize: number;
    createdAt: Date;
  }>>`
    SELECT 
      id::text,
      "entityType",
      LENGTH(changes) as "changesSize",
      "createdAt"
    FROM "AuditLog"
    ORDER BY LENGTH(changes) DESC
    LIMIT 10
  `;

  // Calcular tamaño promedio de logs
  const averageSizeResult = await prisma.$queryRaw<Array<{ avg: number }>>`
    SELECT AVG(LENGTH(changes))::int as avg
    FROM "AuditLog"
    WHERE changes IS NOT NULL
  `;
  const averageLogSize = averageSizeResult[0]?.avg || 0;

  // Análisis por tipo de entidad
  const slowestOperations = await prisma.$queryRaw<Array<{
    entityType: string;
    count: number;
  }>>`
    SELECT 
      "entityType",
      COUNT(*)::int as count
    FROM "AuditLog"
    GROUP BY "entityType"
    ORDER BY COUNT(*) DESC
    LIMIT 10
  `;

  return {
    totalAuditLogs,
    averageLogSize,
    logsLastHour,
    logsLastDay,
    largestLogs: largestLogs.map(log => ({
      ...log,
      changesSize: Number(log.changesSize)
    })),
    slowestOperations: slowestOperations.map(op => ({
      ...op,
      averageTime: 0, // TODO: Implementar medición real
      count: Number(op.count)
    })),
    memoryUsage: {
      rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
      external: Math.round(memoryUsage.external / 1024 / 1024), // MB
    }
  };
}

/**
 * Wrapper optimizado para funciones de auditoría
 */
export function withPerformanceMonitoring<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  operationName: string
) {
  return async (...args: T): Promise<R> => {
    const { result, duration } = await measureTime(() => fn(...args));
    
    // Solo log si es lento (>100ms)
    if (duration > 100) {
      console.warn(`⚠️ Operación lenta [${operationName}]: ${duration.toFixed(2)}ms`);
    }
    
    return result;
  };
}

/**
 * Benchmark de operaciones de auditoría
 */
export async function benchmarkAuditOperations() {
  console.log('🏃‍♂️ Iniciando benchmark de auditoría...');

  const results: Record<string, number> = {};

  // Test 1: Crear log simple
  const simpleData = { id: 1, name: 'Test' };
  const { duration: createTime } = await measureTime(async () => {
    // Simular creación de log (sin escribir a DB)
    const changes = JSON.stringify(simpleData);
    return changes;
  });
  results['JSON.stringify (simple)'] = createTime;

  // Test 2: Crear log complejo
  const complexData = {
    id: 1,
    name: 'Test',
    collaborator: { id: 5, name: 'Juan', email: 'juan@test.com' },
    items: Array(50).fill(0).map((_, i) => ({ id: i, quantity: i * 2 })),
    metadata: { ip: '127.0.0.1', userAgent: 'Mozilla/5.0...' }
  };
  const { duration: complexTime } = await measureTime(async () => {
    const changes = JSON.stringify(complexData);
    return changes;
  });
  results['JSON.stringify (complex)'] = complexTime;

  // Test 3: Comparar objetos (diff)
  const oldData = { ...complexData, name: 'Old Name', items: complexData.items.slice(0, 25) };
  const { duration: diffTime } = await measureTime(async () => {
    const changes: Record<string, unknown> = {};
    for (const key in complexData) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (JSON.stringify((oldData as any)[key]) !== JSON.stringify((complexData as any)[key])) {
        changes[key] = {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          from: (oldData as any)[key],
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          to: (complexData as any)[key]
        };
      }
    }
    return changes;
  });
  results['Calcular cambios (diff)'] = diffTime;

  // Test 4: Insertar en base de datos
  try {
    const { duration: dbTime } = await measureTime(async () => {
      return prisma.auditLog.create({
        data: {
          userId: 1,
          action: 'CREATE',
          entityType: 'Test',
          entityId: 999999,
          changes: JSON.stringify({ test: true }),
          expiresAt: new Date(Date.now() + 86400000), // 1 día
        }
      });
    });
    results['Insertar en DB'] = dbTime;

    // Limpiar el test
    await prisma.auditLog.deleteMany({
      where: { entityType: 'Test', entityId: 999999 }
    });
  } catch (error) {
    console.error('Error en test de DB:', error);
  }

  return results;
}

/**
 * Identifica potenciales memory leaks
 */
export function detectMemoryLeaks(): {
  suspiciousGrowth: boolean;
  recommendations: string[];
} {
  const usage = process.memoryUsage();
  const recommendations: string[] = [];
  let suspiciousGrowth = false;

  // Verificar uso de heap
  const heapUsagePercent = (usage.heapUsed / usage.heapTotal) * 100;
  if (heapUsagePercent > 80) {
    suspiciousGrowth = true;
    recommendations.push('Alto uso de heap (>80%). Considerar limpiar referencias no utilizadas.');
  }

  // Verificar memoria external
  if (usage.external > 50 * 1024 * 1024) { // >50MB
    recommendations.push('Alto uso de memoria externa. Verificar buffers y strings grandes.');
  }

  // Verificar RSS
  if (usage.rss > 200 * 1024 * 1024) { // >200MB
    recommendations.push('Alto uso de memoria RSS. El proceso está utilizando mucha memoria física.');
  }

  return {
    suspiciousGrowth,
    recommendations
  };
}

const performanceAnalyzer = {
  analyzePerformance,
  measureTime,
  withPerformanceMonitoring,
  benchmarkAuditOperations,
  detectMemoryLeaks
};

export default performanceAnalyzer;