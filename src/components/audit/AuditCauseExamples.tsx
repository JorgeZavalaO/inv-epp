import React from 'react';

/**
 * EJEMPLO: Cómo se vería la interfaz con descripciones de causas
 * Este es un componente de demostración que muestra los 3 tipos de errores
 */

export function AuditCauseExamples() {
  return (
    <div className="space-y-6 p-4">
      {/* ===== EJEMPLO 1: QUANTITY_MISMATCH ===== */}
      <div className="border-l-4 border-red-500 bg-white p-4">
        <h3 className="text-lg font-bold text-red-700 mb-3">
          ❌ Discrepancia de Cantidad
        </h3>
        
        <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg mb-4">
          <div>
            <p className="text-xs text-gray-600">Lote</p>
            <p className="font-mono font-bold">BATCH-2025-001</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">EPP</p>
            <p className="font-mono font-bold">GUANTES-N95</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Descripción</p>
            <p className="text-sm">Guantes nitrilo N95 talla L</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Almacén</p>
            <p className="text-sm">Almacén Central</p>
          </div>
        </div>

        {/* NUEVA SECCIÓN: Causa e Impacto */}
        <div className="space-y-3 border-l-4 border-blue-400 pl-3 py-2 bg-blue-50 rounded mb-4">
          <div>
            <p className="text-xs font-semibold text-blue-900 uppercase tracking-wider">
              ¿Por qué sucedió?
            </p>
            <p className="text-sm text-blue-800 mt-1">
              Se detectaron 2 movimientos creados con 15 minutos de diferencia. 
              Probable causa: La entrega fue editada y el sistema creó movimientos 
              adicionales en lugar de actualizar el existente.
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-blue-900 uppercase tracking-wider">
              Impacto en Inventario
            </p>
            <p className="text-sm text-blue-800 mt-1">
              Stock descontado 50 en lugar de 100, generando discrepancia de 50 unidades
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 p-3 bg-red-50 rounded-lg border border-red-200 mb-4">
          <div>
            <p className="text-xs text-red-600">En Entrega</p>
            <p className="text-2xl font-bold text-red-700">100</p>
            <p className="text-xs text-red-600">unidades</p>
          </div>
          <div>
            <p className="text-xs text-red-600">En Movimientos</p>
            <p className="text-2xl font-bold text-red-700">50</p>
            <p className="text-xs text-red-600">unidades</p>
          </div>
        </div>
      </div>

      {/* ===== EJEMPLO 2: MISSING_MOVEMENT ===== */}
      <div className="border-l-4 border-orange-500 bg-white p-4">
        <h3 className="text-lg font-bold text-orange-700 mb-3">
          ❌ Movimiento Faltante
        </h3>
        
        <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg mb-4">
          <div>
            <p className="text-xs text-gray-600">Lote</p>
            <p className="font-mono font-bold">BATCH-2025-045</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">EPP</p>
            <p className="font-mono font-bold">CASCOS-V2</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Descripción</p>
            <p className="text-sm">Casco de protección V-Guard 500</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Almacén</p>
            <p className="text-sm">Almacén Zona B</p>
          </div>
        </div>

        {/* NUEVA SECCIÓN: Causa e Impacto */}
        <div className="space-y-3 border-l-4 border-blue-400 pl-3 py-2 bg-blue-50 rounded mb-4">
          <div>
            <p className="text-xs font-semibold text-blue-900 uppercase tracking-wider">
              ¿Por qué sucedió?
            </p>
            <p className="text-sm text-blue-800 mt-1">
              La entrega se registró pero no se generó el movimiento de stock correspondiente. 
              Posiblemente por error en la creación o problema técnico durante la transacción.
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-blue-900 uppercase tracking-wider">
              Impacto en Inventario
            </p>
            <p className="text-sm text-blue-800 mt-1">
              El stock no se ha descontado, generando discrepancia de inventario
            </p>
          </div>
        </div>

        <div className="p-3 bg-red-50 rounded-lg border border-red-200 mb-4">
          <p className="text-sm font-semibold text-red-900">
            La entrega existe pero NO tiene movimiento
          </p>
          <p className="text-lg font-bold text-red-700 mt-2">250 unidades</p>
        </div>
      </div>

      {/* ===== EJEMPLO 3: ORPHAN_MOVEMENT (Reciente) ===== */}
      <div className="border-l-4 border-yellow-500 bg-white p-4">
        <h3 className="text-lg font-bold text-yellow-700 mb-3">
          ⚠️ Movimiento Huérfano (Reciente)
        </h3>
        
        <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg mb-4">
          <div>
            <p className="text-xs text-gray-600">Lote</p>
            <p className="font-mono font-bold">BATCH-2025-089</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">EPP</p>
            <p className="font-mono font-bold">RESPIRADORES</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Descripción</p>
            <p className="text-sm">Respirador 3M modelo 9320+</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Almacén</p>
            <p className="text-sm">Almacén Central</p>
          </div>
        </div>

        {/* NUEVA SECCIÓN: Causa e Impacto - Reciente */}
        <div className="space-y-3 border-l-4 border-blue-400 pl-3 py-2 bg-blue-50 rounded mb-4">
          <div>
            <p className="text-xs font-semibold text-blue-900 uppercase tracking-wider">
              ¿Por qué sucedió?
            </p>
            <p className="text-sm text-blue-800 mt-1">
              Inconsistencia temporal: El movimiento se creó hace menos de 24 horas pero no 
              tiene entrega asociada. Posible causa: La entrada aún no se ha registrado o 
              hay un desfase en la sincronización.
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-blue-900 uppercase tracking-wider">
              Impacto en Inventario
            </p>
            <p className="text-sm text-blue-800 mt-1">
              100 unidades de stock descontadas sin documentación de entrega. 
              Genera discrepancia en el inventario disponible.
            </p>
          </div>
        </div>

        <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200 mb-4">
          <p className="text-sm font-semibold text-yellow-900">
            Hay un movimiento sin entrega correspondiente
          </p>
          <p className="text-lg font-bold text-yellow-700 mt-2">100 unidades</p>
        </div>
      </div>

      {/* ===== EJEMPLO 4: ORPHAN_MOVEMENT (Antiguo) ===== */}
      <div className="border-l-4 border-red-500 bg-white p-4">
        <h3 className="text-lg font-bold text-red-700 mb-3">
          🔴 Movimiento Huérfano (Antiguo)
        </h3>
        
        <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg mb-4">
          <div>
            <p className="text-xs text-gray-600">Lote</p>
            <p className="font-mono font-bold">BATCH-2024-200</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">EPP</p>
            <p className="font-mono font-bold">BATAS-LATEX</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Descripción</p>
            <p className="text-sm">Batas quirúrgicas de látex - Talla M</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Almacén</p>
            <p className="text-sm">Almacén Zona A</p>
          </div>
        </div>

        {/* NUEVA SECCIÓN: Causa e Impacto - Antiguo */}
        <div className="space-y-3 border-l-4 border-blue-400 pl-3 py-2 bg-blue-50 rounded mb-4">
          <div>
            <p className="text-xs font-semibold text-blue-900 uppercase tracking-wider">
              ¿Por qué sucedió?
            </p>
            <p className="text-sm text-blue-800 mt-1">
              La entrega asociada fue eliminada hace 156 días sin revertir su movimiento de 
              stock. Esto indica un error antiguo en la eliminación de entregas.
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-blue-900 uppercase tracking-wider">
              Impacto en Inventario
            </p>
            <p className="text-sm text-blue-800 mt-1">
              500 unidades de stock descontadas sin documentación de entrega. 
              Genera discrepancia crítica en el inventario disponible.
            </p>
          </div>
        </div>

        <div className="p-3 bg-red-50 rounded-lg border border-red-200 mb-4">
          <p className="text-sm font-semibold text-red-900">
            Hay un movimiento sin entrega correspondiente
          </p>
          <p className="text-lg font-bold text-red-700 mt-2">500 unidades</p>
          <p className="text-xs text-red-700 mt-2">
            Creado hace más de 5 meses - Requiere revisión urgente
          </p>
        </div>
      </div>
    </div>
  );
}
