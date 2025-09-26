// app/api/health/route.ts
// Health check endpoint para verificar que todo funciona después del deploy

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Verificar conexión a base de datos
    const dbCheck = await prisma.$queryRaw`SELECT 1 as health`;
    
    // Verificar que las tablas críticas existen
    const tablesCheck = await prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('EPP', 'DeliveryBatch', 'Collaborator')
    `;
    
    // Verificar índices críticos
    const indexesCheck = await prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*) as count
      FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND indexname LIKE 'idx_%'
    `;
    
    // Verificar migración más reciente
    const migrationCheck = await prisma.$queryRaw<Array<{ migration_name: string }>>`
      SELECT migration_name 
      FROM _prisma_migrations 
      ORDER BY finished_at DESC 
      LIMIT 1
    `;
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: {
        connected: Array.isArray(dbCheck) && dbCheck.length > 0,
        tables: tablesCheck[0]?.count || 0,
        indexes: indexesCheck[0]?.count || 0,
        lastMigration: migrationCheck[0]?.migration_name || 'none'
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        vercel: !!process.env.VERCEL,
        region: process.env.VERCEL_REGION || 'unknown'
      }
    };
    
    return NextResponse.json(health, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      }
    });
    
  } catch (error) {
    console.error('Health check failed:', error);
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      environment: {
        nodeEnv: process.env.NODE_ENV,
        vercel: !!process.env.VERCEL,
        region: process.env.VERCEL_REGION || 'unknown'
      }
    }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      }
    });
  }
}