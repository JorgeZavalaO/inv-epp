/**
 * Job de Limpieza de Logs de Auditoría
 * 
 * Elimina logs expirados para prevenir crecimiento descontrolado de la base de datos.
 * 
 * Uso:
 * - Ejecutar manualmente: node --loader ts-node/esm scripts/cleanup-audit-logs.ts [--dry-run] [--max-batches=N]
 * - Programar con cron: Vercel Cron Jobs o similar
 * 
 * Características:
 * - Elimina en lotes para no bloquear la DB
 * - Solo elimina logs expirados (campo expiresAt)
 * - Reporta estadísticas de limpieza
 * - Modo DRY-RUN para validar sin eliminar
 */

import prisma from '../src/lib/prisma';
import { CLEANUP_CONFIG } from '../src/lib/audit/config';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const maxBatchesArg = args.find((a) => a.startsWith('--max-batches='));
const MAX_BATCHES = maxBatchesArg ? parseInt(maxBatchesArg.split('=')[1], 10) : undefined;

interface CleanupStats {
  deletedCount: number;
  duration: number;
  batchesProcessed: number;
  oldestDeleted?: Date;
  newestDeleted?: Date;
}

/**
 * Limpia logs de auditoría expirados
 */
export async function cleanupExpiredAuditLogs(): Promise<CleanupStats> {
  const startTime = Date.now();
  const now = new Date();
  
  console.log(`🗑️ Iniciando limpieza de logs expirados...${DRY_RUN ? ' (DRY-RUN)' : ''}`);
  console.log(`   Fecha actual: ${now.toISOString()}`);

  if (!CLEANUP_CONFIG.enabled) {
    console.log('⚠️ Limpieza deshabilitada en configuración');
    return {
      deletedCount: 0,
      duration: 0,
      batchesProcessed: 0,
    };
  }

  let totalDeleted = 0;
  let batchesProcessed = 0;
  let oldestDeleted: Date | undefined;
  let newestDeleted: Date | undefined;

  try {
    // Procesar en lotes para no bloquear la DB
    while (true) {
      // Buscar lotes de registros expirados
      const expiredLogs = await prisma.auditLog.findMany({
        where: {
          expiresAt: {
            lt: now, // Menor que ahora = expirado
          },
        },
        select: {
          id: true,
          createdAt: true,
          expiresAt: true,
        },
        take: CLEANUP_CONFIG.batchSize,
        orderBy: {
          expiresAt: 'asc', // Más antiguos primero
        },
      });

      if (expiredLogs.length === 0) {
        break; // No hay más logs expirados
      }

      // Capturar estadísticas
      if (!oldestDeleted) {
        oldestDeleted = expiredLogs[0].createdAt;
      }
      newestDeleted = expiredLogs[expiredLogs.length - 1].createdAt;

      // Eliminar el lote (o simular en DRY-RUN)
      const ids = expiredLogs.map((log) => log.id);
      let deletedCount = 0;
      if (DRY_RUN) {
        deletedCount = ids.length;
      } else {
        const deleted = await prisma.auditLog.deleteMany({
          where: {
            id: {
              in: ids,
            },
          },
        });
        deletedCount = deleted.count;
      }

      totalDeleted += deletedCount;
      batchesProcessed++;

      console.log(
        `   Lote ${batchesProcessed}: ${deletedCount} logs ${DRY_RUN ? 'simulados' : 'eliminados'}`
      );

      // Si el lote es menor que el tamaño configurado, terminamos
      if (expiredLogs.length < CLEANUP_CONFIG.batchSize) {
        break;
      }

      // Límite de lotes si se configura
      if (MAX_BATCHES && batchesProcessed >= MAX_BATCHES) {
        console.log(`   ⏹️ Se alcanzó el límite de lotes configurado (${MAX_BATCHES})`);
        break;
      }
    }

    const duration = Date.now() - startTime;
    const stats: CleanupStats = {
      deletedCount: totalDeleted,
      duration,
      batchesProcessed,
      oldestDeleted,
      newestDeleted,
    };

    console.log('\n✅ Limpieza completada:');
    console.log(`   Total ${DRY_RUN ? 'simulados' : 'eliminados'}: ${stats.deletedCount} logs`);
    console.log(`   Lotes procesados: ${stats.batchesProcessed}`);
    console.log(`   Duración: ${stats.duration}ms`);
    if (stats.oldestDeleted) {
      console.log(`   Más antiguo: ${stats.oldestDeleted.toISOString()}`);
    }
    if (stats.newestDeleted) {
      console.log(`   Más reciente: ${stats.newestDeleted.toISOString()}`);
    }

    return stats;
  } catch (error) {
    console.error('❌ Error durante limpieza:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Obtiene estadísticas de los logs de auditoría
 */
export async function getAuditLogStats() {
  try {
    const [total, expired, byEntityType] = await Promise.all([
      // Total de logs
      prisma.auditLog.count(),

      // Logs expirados
      prisma.auditLog.count({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      }),

      // Distribución por tipo de entidad
      prisma.$queryRaw<Array<{ entityType: string; count: bigint }>>`
        SELECT "entityType", COUNT(*) as count
        FROM "AuditLog"
        GROUP BY "entityType"
        ORDER BY count DESC
      `,
    ]);

    console.log('\n📊 Estadísticas de Auditoría:');
    console.log(`   Total de logs: ${total}`);
    console.log(`   Logs expirados: ${expired} (${((expired / total) * 100).toFixed(2)}%)`);
    console.log(`   Logs activos: ${total - expired}`);
    console.log('\n   Distribución por entidad:');
    
    byEntityType.forEach((row) => {
      const count = Number(row.count);
      const percentage = ((count / total) * 100).toFixed(2);
      console.log(`   - ${row.entityType}: ${count} (${percentage}%)`);
    });

    return {
      total,
      expired,
      active: total - expired,
      byEntityType: byEntityType.map(row => ({
        entityType: row.entityType,
        count: Number(row.count),
      })),
    };
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error);
    throw error;
  }
}

// Si se ejecuta directamente
if (require.main === module) {
  cleanupExpiredAuditLogs()
    .then((stats) => {
      console.log('\n🎉 Proceso completado exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Error fatal:', error);
      process.exit(1);
    });
}
