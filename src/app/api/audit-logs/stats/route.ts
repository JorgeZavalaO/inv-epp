/**
 * API Endpoint para Estadísticas de Auditoría
 * 
 * GET /api/audit-logs/stats
 * - Obtener estadísticas agregadas de los logs
 * - Total de logs, logs expirados, distribución por entidad, etc.
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    // Verificar autenticación
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const now = new Date();

    // Obtener estadísticas en paralelo
    const [total, expired, active, byEntityType, byAction, recentActivity] =
      await Promise.all([
        // Total de logs
        prisma.auditLog.count(),

        // Logs expirados (pendientes de limpieza)
        prisma.auditLog.count({
          where: {
            expiresAt: {
              lt: now,
            },
          },
        }),

        // Logs activos (no expirados)
        prisma.auditLog.count({
          where: {
            expiresAt: {
              gte: now,
            },
          },
        }),

        // Distribución por tipo de entidad
        prisma.auditLog.groupBy({
          by: ['entityType'],
          _count: {
            id: true,
          },
          orderBy: {
            _count: {
              id: 'desc',
            },
          },
        }),

        // Distribución por acción
        prisma.auditLog.groupBy({
          by: ['action'],
          _count: {
            id: true,
          },
        }),

        // Actividad reciente (últimas 24 horas)
        prisma.auditLog.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
            },
          },
        }),
      ]);

    // Calcular almacenamiento estimado
    // Promedio: 1.2 KB por log
    const estimatedStorageMB = (total * 1.2) / 1024;

    return NextResponse.json({
      total,
      expired,
      active,
      recentActivity,
      storageEstimate: {
        totalMB: estimatedStorageMB.toFixed(2),
        totalGB: (estimatedStorageMB / 1024).toFixed(4),
      },
      byEntityType: byEntityType.map((item) => ({
        entityType: item.entityType,
        count: item._count.id,
        percentage: ((item._count.id / total) * 100).toFixed(2),
      })),
      byAction: byAction.map((item) => ({
        action: item.action,
        count: item._count.id,
        percentage: ((item._count.id / total) * 100).toFixed(2),
      })),
    });
  } catch (error) {
    console.error('[API] Error obteniendo estadísticas:', error);
    return NextResponse.json(
      { error: 'Error al obtener estadísticas' },
      { status: 500 }
    );
  }
}
