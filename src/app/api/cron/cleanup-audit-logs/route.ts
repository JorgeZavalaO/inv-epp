/**
 * Vercel Cron Job - Limpieza de Audit Logs
 * 
 * Este endpoint se ejecuta automáticamente cada día a las 2 AM
 * para eliminar logs de auditoría expirados.
 * 
 * Configurado en vercel.json
 */

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { CLEANUP_CONFIG } from '@/lib/audit/config';

export async function GET(request: Request) {
  try {
    // Verificar que la solicitud viene de Vercel Cron
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    console.log('🕐 [CRON] Iniciando limpieza de audit logs...');

    if (!CLEANUP_CONFIG.enabled) {
      console.log('⚠️ [CRON] Limpieza deshabilitada en configuración');
      return NextResponse.json({
        success: true,
        message: 'Limpieza deshabilitada',
        deletedCount: 0,
      });
    }

    const startTime = Date.now();
    const now = new Date();
    let totalDeleted = 0;
    let batchesProcessed = 0;

    // Procesar en lotes
    while (true) {
      const expiredLogs = await prisma.auditLog.findMany({
        where: {
          expiresAt: {
            lt: now,
          },
        },
        select: {
          id: true,
        },
        take: CLEANUP_CONFIG.batchSize,
      });

      if (expiredLogs.length === 0) {
        break;
      }

      const ids = expiredLogs.map((log) => log.id);
      const deleted = await prisma.auditLog.deleteMany({
        where: {
          id: {
            in: ids,
          },
        },
      });

      totalDeleted += deleted.count;
      batchesProcessed++;

      console.log(`   [CRON] Lote ${batchesProcessed}: ${deleted.count} logs eliminados`);

      // Limitar a 10 lotes por ejecución para no exceder timeout de Vercel
      if (batchesProcessed >= 10) {
        console.log('   [CRON] Límite de lotes alcanzado, siguiente ejecución continuará');
        break;
      }

      if (expiredLogs.length < CLEANUP_CONFIG.batchSize) {
        break;
      }
    }

    const duration = Date.now() - startTime;

    console.log(`✅ [CRON] Limpieza completada: ${totalDeleted} logs en ${duration}ms`);

    return NextResponse.json({
      success: true,
      deletedCount: totalDeleted,
      batchesProcessed,
      duration,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ [CRON] Error en limpieza:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}
