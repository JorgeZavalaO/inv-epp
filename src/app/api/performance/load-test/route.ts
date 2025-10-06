import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { preset } = body;

    // Validar preset
    const validPresets = ['light', 'moderate', 'heavy', 'stress'];
    if (!validPresets.includes(preset)) {
      return NextResponse.json(
        { error: 'Preset inválido. Use: light, moderate, heavy, stress' }, 
        { status: 400 }
      );
    }

    // Importar dinámicamente el módulo de pruebas
    const { runPresetLoadTest } = await import('@/lib/performance/load-test');

    console.log(`🎯 Ejecutando prueba de carga preset: ${preset} por usuario ${session.user.id}`);

    // Ejecutar prueba de carga
    const result = await runPresetLoadTest(preset as 'light' | 'moderate' | 'heavy' | 'stress');

    return NextResponse.json({
      success: true,
      preset,
      result: {
        config: result.config,
        duration: result.duration,
        operationsCompleted: result.operationsCompleted,
        operationsFailed: result.operationsFailed,
        averageLatency: result.averageLatency,
        throughput: result.operationsCompleted / (result.duration / 1000),
        memoryGrowth: result.memoryAfter.heapUsed - result.memoryBefore.heapUsed,
        memoryGrowthPercent: ((result.memoryAfter.heapUsed - result.memoryBefore.heapUsed) / result.memoryBefore.heapUsed) * 100,
        loggerStats: result.loggerStatsAfter,
        systemHealth: result.quickCheck
      },
      message: `Prueba ${preset} completada: ${result.operationsCompleted} operaciones en ${(result.duration / 1000).toFixed(2)}s`
    });

  } catch (error) {
    console.error('Error ejecutando prueba de carga:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}