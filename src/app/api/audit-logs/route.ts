/**
 * API Endpoint para Logs de Auditoría
 * 
 * GET /api/audit-logs
 * - Obtener logs de auditoría con filtros
 * - Requiere autenticación
 * 
 * Query parameters:
 * - entityType: Filtrar por tipo de entidad
 * - entityId: Filtrar por ID de entidad
 * - userId: Filtrar por usuario
 * - action: Filtrar por acción (CREATE, UPDATE, DELETE)
 * - dateFrom: Fecha desde
 * - dateTo: Fecha hasta
 * - page: Página (default: 1)
 * - limit: Resultados por página (default: 50)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Obtener parámetros de búsqueda
    const searchParams = request.nextUrl.searchParams;
    const entityType = searchParams.get('entityType');
    const entityId = searchParams.get('entityId');
    const userIdFilter = searchParams.get('userId');
    const action = searchParams.get('action');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

    // Construir filtros
    const where: {
      entityType?: string;
      entityId?: number;
      userId?: number;
      action?: 'CREATE' | 'UPDATE' | 'DELETE';
      createdAt?: {
        gte?: Date;
        lte?: Date;
      };
    } = {};

    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = parseInt(entityId);
    if (userIdFilter) where.userId = parseInt(userIdFilter);
    if (action) where.action = action as 'CREATE' | 'UPDATE' | 'DELETE';
    
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    // Obtener total de registros
    const total = await prisma.auditLog.count({ where });

    // Obtener logs paginados
    const logs = await prisma.auditLog.findMany({
      where,
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
      skip: (page - 1) * limit,
      take: limit,
    });

    // Parsear changes de string a JSON
    const logsWithParsedChanges = logs.map((log) => ({
      ...log,
      changes: log.changes ? JSON.parse(log.changes) : null,
    }));

    return NextResponse.json({
      logs: logsWithParsedChanges,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[API] Error obteniendo audit logs:', error);
    return NextResponse.json(
      { error: 'Error al obtener logs de auditoría' },
      { status: 500 }
    );
  }
}
