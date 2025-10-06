import { NextResponse } from 'next/server';
import { runQuickPerformanceCheck } from '@/lib/performance/diagnostic';

export async function GET() {
  try {
    const result = await runQuickPerformanceCheck();
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error en quick performance check:', error);
    
    return NextResponse.json(
      { 
        status: 'critical', 
        message: 'Error interno del servidor al verificar performance' 
      },
      { status: 500 }
    );
  }
}