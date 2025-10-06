/**
 * Script de Prueba de Performance del Sistema de Auditoría
 * 
 * Simula carga de trabajo para probar el logger optimizado
 * y compara performance con el sistema anterior.
 */

import { optimizedAuditCreate, optimizedAuditUpdate, getOptimizedLoggerStats, forceFlushOptimizedLogs } from '@/lib/audit/optimized-logger';
import { runQuickPerformanceCheck } from '@/lib/performance/diagnostic';

interface LoadTestConfig {
  operationsCount: number;
  concurrentUsers: number;
  intervalMs: number;
}

interface LoadTestResult {
  config: LoadTestConfig;
  startTime: Date;
  endTime: Date;
  duration: number;
  operationsCompleted: number;
  operationsFailed: number;
  averageLatency: number;
  memoryBefore: NodeJS.MemoryUsage;
  memoryAfter: NodeJS.MemoryUsage;
  loggerStatsAfter: Record<string, unknown>;
  quickCheck: Record<string, unknown>;
}

export async function runLoadTest(config: LoadTestConfig): Promise<LoadTestResult> {
  console.log('🚀 Iniciando prueba de carga del sistema de auditoría optimizado...');
  console.log(`Configuración: ${config.operationsCount} operaciones, ${config.concurrentUsers} usuarios concurrentes`);

  const startTime = new Date();
  const memoryBefore = process.memoryUsage();
  
  let operationsCompleted = 0;
  let operationsFailed = 0;
  const latencies: number[] = [];

  try {
    // Simular múltiples usuarios concurrentes
    const userPromises: Promise<void>[] = [];
    
    for (let userId = 1; userId <= config.concurrentUsers; userId++) {
      const userPromise = simulateUserActivity(
        `user_${userId}`, 
        config.operationsCount / config.concurrentUsers,
        config.intervalMs,
        (success, latency) => {
          if (success) {
            operationsCompleted++;
            if (latency) latencies.push(latency);
          } else {
            operationsFailed++;
          }
        }
      );
      
      userPromises.push(userPromise);
    }

    // Esperar a que todas las simulaciones terminen
    await Promise.all(userPromises);

    // Forzar flush de todos los logs pendientes
    console.log('🔄 Forzando flush de logs pendientes...');
    await forceFlushOptimizedLogs();

    const endTime = new Date();
    const memoryAfter = process.memoryUsage();

    // Obtener estadísticas finales
    const loggerStatsAfter = await getOptimizedLoggerStats();
    const quickCheck = await runQuickPerformanceCheck();

    const result: LoadTestResult = {
      config,
      startTime,
      endTime,
      duration: endTime.getTime() - startTime.getTime(),
      operationsCompleted,
      operationsFailed,
      averageLatency: latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0,
      memoryBefore,
      memoryAfter,
      loggerStatsAfter,
      quickCheck
    };

    console.log('✅ Prueba de carga completada');
    logLoadTestResults(result);

    return result;

  } catch (error) {
    console.error('❌ Error en prueba de carga:', error);
    throw error;
  }
}

async function simulateUserActivity(
  userId: string,
  operationsCount: number,
  intervalMs: number,
  onOperation: (success: boolean, latency?: number) => void
): Promise<void> {
  for (let i = 0; i < operationsCount; i++) {
    try {
      const operationStart = Date.now();

      // Simular diferentes tipos de operaciones de auditoría
      const operationType = Math.random();
      
      if (operationType < 0.5) {
        // Crear nueva entrega (50%)
        await optimizedAuditCreate(
          userId, // Ya es string, no parsear
          'DeliveryBatch',
          1000 + parseInt(userId.replace('user_', '')) * 1000 + i,
          {
            collaboratorCode: `COL${i.toString().padStart(3, '0')}`,
            eppCode: `EPP${i.toString().padStart(3, '0')}`,
            warehouseId: `warehouse_${i % 5 + 1}`,
            quantity: Math.floor(Math.random() * 10) + 1,
            observations: `Entrega de prueba ${i} para usuario ${userId}`,
            metadata: {
              testRun: true,
              operationNumber: i,
              timestamp: new Date().toISOString()
            }
          }
        );
      } else {
        // Actualizar entrega existente (50%)
        const deliveryId = 1000 + parseInt(userId.replace('user_', '')) * 1000 + Math.floor(i / 2);
        await optimizedAuditUpdate(
          userId, // Ya es string, no parsear
          'DeliveryBatch',
          deliveryId,
          {
            status: 'updated',
            observations: `Actualización ${i}`,
            lastModified: new Date().toISOString()
          },
          {
            status: 'pending',
            observations: `Observación anterior`,
            lastModified: new Date(Date.now() - 3600000).toISOString()
          }
        );
      }

      const latency = Date.now() - operationStart;
      onOperation(true, latency);

      // Esperar el intervalo configurado
      if (intervalMs > 0 && i < operationsCount - 1) {
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      }

    } catch (error) {
      console.error(`Error en operación ${i} para usuario ${userId}:`, error);
      onOperation(false);
    }
  }
}

function logLoadTestResults(result: LoadTestResult): void {
  console.log('\n📊 RESULTADOS DE LA PRUEBA DE CARGA');
  console.log('=====================================');
  
  console.log('\n⚙️ Configuración:');
  console.log(`   • Operaciones totales: ${result.config.operationsCount}`);
  console.log(`   • Usuarios concurrentes: ${result.config.concurrentUsers}`);
  console.log(`   • Intervalo entre ops: ${result.config.intervalMs}ms`);
  
  console.log('\n⏱️ Tiempos:');
  console.log(`   • Duración total: ${(result.duration / 1000).toFixed(2)}s`);
  console.log(`   • Latencia promedio: ${result.averageLatency.toFixed(2)}ms`);
  console.log(`   • Throughput: ${(result.operationsCompleted / (result.duration / 1000)).toFixed(2)} ops/s`);
  
  console.log('\n📈 Resultados:');
  console.log(`   • Operaciones exitosas: ${result.operationsCompleted}`);
  console.log(`   • Operaciones fallidas: ${result.operationsFailed}`);
  console.log(`   • Tasa de éxito: ${((result.operationsCompleted / (result.operationsCompleted + result.operationsFailed)) * 100).toFixed(2)}%`);
  
  console.log('\n🧠 Uso de Memoria:');
  const memoryGrowth = result.memoryAfter.heapUsed - result.memoryBefore.heapUsed;
  console.log(`   • Memoria inicial: ${(result.memoryBefore.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   • Memoria final: ${(result.memoryAfter.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   • Crecimiento: ${(memoryGrowth / 1024 / 1024).toFixed(2)} MB (${memoryGrowth > 0 ? '+' : ''}${((memoryGrowth / result.memoryBefore.heapUsed) * 100).toFixed(2)}%)`);
  
  console.log('\n📋 Logger Stats:');
  console.log(`   • Cola actual: ${result.loggerStatsAfter.queueSize} logs`);
  console.log(`   • Procesando: ${result.loggerStatsAfter.isProcessing ? 'Sí' : 'No'}`);
  console.log(`   • Usuarios limitados: ${result.loggerStatsAfter.rateLimitedUsers}`);
  
  console.log('\n🏥 Estado de Salud:');
  console.log(`   • Estado: ${result.quickCheck.status}`);
  console.log(`   • Mensaje: ${result.quickCheck.message}`);
  
  const healthEmoji = result.quickCheck.status === 'good' ? '✅' : 
                     result.quickCheck.status === 'warning' ? '⚠️' : '🚨';
  console.log(`\n${healthEmoji} Estado general del sistema: ${String(result.quickCheck.status).toUpperCase()}`);
}

// Configuraciones de prueba predefinidas
export const loadTestConfigs = {
  light: { operationsCount: 50, concurrentUsers: 2, intervalMs: 100 },
  moderate: { operationsCount: 200, concurrentUsers: 5, intervalMs: 50 },
  heavy: { operationsCount: 500, concurrentUsers: 10, intervalMs: 20 },
  stress: { operationsCount: 1000, concurrentUsers: 20, intervalMs: 10 }
};

export async function runPresetLoadTest(preset: keyof typeof loadTestConfigs): Promise<LoadTestResult> {
  const config = loadTestConfigs[preset];
  console.log(`🎯 Ejecutando prueba de carga preset: ${preset.toUpperCase()}`);
  return await runLoadTest(config);
}