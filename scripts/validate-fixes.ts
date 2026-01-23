/**
 * Script de Validación de Correcciones
 * Verifica que los problemas identificados hayan sido resueltos
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function validateFixes() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('✅ VALIDACIÓN DE CORRECCIONES DE LÓGICA');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    // ============================================
    // 1. VALIDACIÓN: Sin movimientos huérfanos
    // ============================================
    console.log('📌 VALIDACIÓN 1: Movimientos Huérfanos\n');
    
    const movements = await prisma.stockMovement.findMany({
      where: { type: 'EXIT' },
      include: {
        epp: { select: { code: true, name: true } },
        warehouse: { select: { name: true } },
      },
    });

    const deliveries = await prisma.delivery.findMany({
      include: {
        batch: {
          select: { code: true, warehouseId: true },
        },
        epp: { select: { code: true } },
      },
    });

    const orphanMovements = [];
    for (const movement of movements) {
      const hasDelivery = deliveries.some(d =>
        d.eppId === movement.eppId &&
        d.batch.warehouseId === movement.warehouseId &&
        movement.note?.includes(d.batch.code)
      );

      if (!hasDelivery && movement.note?.startsWith('Entrega')) {
        orphanMovements.push({
          movementId: movement.id,
          eppCode: movement.epp.code,
          warehouse: movement.warehouse.name,
          qty: movement.quantity,
          createdAt: movement.createdAt,
        });
      }
    }

    console.log(`   Movimientos EXIT encontrados: ${movements.length}`);
    console.log(`   Entregas encontradas: ${deliveries.length}`);
    console.log(`   Movimientos huérfanos: ${orphanMovements.length}`);
    
    if (orphanMovements.length === 0) {
      console.log('   ✅ RESULTADO: CORRECTO - No hay movimientos huérfanos\n');
    } else {
      console.log(`   ⚠️  RESULTADO: ${orphanMovements.length} movimientos sin entrega\n`);
      orphanMovements.slice(0, 5).forEach(m => {
        console.log(`      - Mov #${m.movementId}: ${m.eppCode} x${m.qty}`);
      });
    }

    // ============================================
    // 2. VALIDACIÓN: Cantidades balanceadas
    // ============================================
    console.log('\n📌 VALIDACIÓN 2: Balance de Cantidades\n');
    
    const quantityMismatches = [];
    for (const delivery of deliveries) {
      const relatedMovements = movements.filter(m =>
        m.eppId === delivery.eppId &&
        m.warehouseId === delivery.batch.warehouseId &&
        m.note?.includes(delivery.batch.code)
      );

      if (relatedMovements.length > 0) {
        const totalMovementQty = relatedMovements.reduce((sum, m) => sum + m.quantity, 0);
        if (totalMovementQty !== delivery.quantity) {
          quantityMismatches.push({
            batchCode: delivery.batch.code,
            eppCode: delivery.epp.code,
            deliveryQty: delivery.quantity,
            movementQty: totalMovementQty,
            difference: delivery.quantity - totalMovementQty,
            numMovements: relatedMovements.length,
          });
        }
      }
    }

    console.log(`   Discrepancias de cantidad encontradas: ${quantityMismatches.length}`);
    
    if (quantityMismatches.length === 0) {
      console.log('   ✅ RESULTADO: CORRECTO - Todas las cantidades balanceadas\n');
    } else {
      console.log(`   ⚠️  RESULTADO: ${quantityMismatches.length} discrepancias\n`);
      quantityMismatches.slice(0, 5).forEach(m => {
        console.log(`      - Lote ${m.batchCode}: Entrega ${m.deliveryQty}, Movimientos ${m.movementQty} (${m.numMovements} mov.)`);
      });
    }

    // ============================================
    // 3. VALIDACIÓN: Timestamps consistentes
    // ============================================
    console.log('\n📌 VALIDACIÓN 3: Consistencia de Timestamps\n');
    
    const invalidDates = [];
    for (const delivery of deliveries) {
      const relatedMovements = movements.filter(m =>
        m.eppId === delivery.eppId &&
        m.warehouseId === delivery.batch.warehouseId &&
        m.note?.includes(delivery.batch.code)
      );

      for (const movement of relatedMovements) {
        if (movement.createdAt < delivery.createdAt) {
          const diff = Math.floor((delivery.createdAt.getTime() - movement.createdAt.getTime()) / 1000);
          invalidDates.push({
            batchCode: delivery.batch.code,
            eppCode: delivery.epp.code,
            movementTime: movement.createdAt,
            deliveryTime: delivery.createdAt,
            differenceSeconds: diff,
          });
        }
      }
    }

    console.log(`   Inconsistencias de fecha encontradas: ${invalidDates.length}`);
    
    if (invalidDates.length === 0) {
      console.log('   ✅ RESULTADO: CORRECTO - Todas las fechas son consistentes\n');
    } else {
      console.log(`   ⚠️  RESULTADO: ${invalidDates.length} inconsistencias\n`);
      invalidDates.slice(0, 5).forEach(d => {
        console.log(`      - Lote ${d.batchCode}: ${d.differenceSeconds}s ANTES`);
      });
    }

    // ============================================
    // 4. VALIDACIÓN: Sin movimientos duplicados
    // ============================================
    console.log('\n📌 VALIDACIÓN 4: Movimientos Duplicados por Edición\n');
    
    const duplicateMovements = [];
    
    // Agrupar entregas por lote
    const deliveriesByBatch = new Map<string, any[]>();
    for (const d of deliveries) {
      const batchCode = d.batch.code;
      if (!deliveriesByBatch.has(batchCode)) {
        deliveriesByBatch.set(batchCode, []);
      }
      deliveriesByBatch.get(batchCode)!.push(d);
    }
    
    // Para cada lote, verificar si hay movimientos duplicados
    for (const [batchCode, batchDeliveries] of deliveriesByBatch) {
      // Obtener movimientos para este lote
      const batchMovements = movements.filter(m =>
        m.note?.includes(`Entrega ${batchCode}`)
      );
      
      if (batchMovements.length === 0) continue;
      
      // Agrupar movimientos por EPP
      const byEpp = new Map<number, any[]>();
      for (const m of batchMovements) {
        if (!byEpp.has(m.eppId)) byEpp.set(m.eppId, []);
        byEpp.get(m.eppId)!.push(m);
      }

      // Buscar EPPs con múltiples movimientos (indicativo de duplicados por edición)
      for (const [eppId, eppMovements] of byEpp) {
        // Si hay más de 1 movimiento para el mismo EPP y lote, y todos son del mismo tipo
        if (eppMovements.length > 1) {
          const allSameType = eppMovements.every(m => m.type === eppMovements[0].type);
          const totalQty = eppMovements.reduce((s, m) => s + m.quantity, 0);
          
          const delivery = batchDeliveries.find(d => d.eppId === eppId);
          
          if (delivery && allSameType && totalQty === delivery.quantity) {
            // Esto es OK: múltiples entregas de ajuste que suman correctamente
            continue;
          }
          
          duplicateMovements.push({
            batchCode,
            eppId,
            count: eppMovements.length,
            totalQty,
            expectedQty: delivery?.quantity,
            types: eppMovements.map(m => m.type),
          });
        }
      }
    }

    console.log(`   Patrones de duplicación detectados: ${duplicateMovements.length}`);
    
    if (duplicateMovements.length === 0) {
      console.log('   ✅ RESULTADO: CORRECTO - No hay movimientos duplicados\n');
    } else {
      console.log(`   ⚠️  RESULTADO: ${duplicateMovements.length} patrones sospechosos\n`);
      duplicateMovements.slice(0, 5).forEach(d => {
        console.log(`      - Lote ${d.batchCode}, EPP ${d.eppId}: ${d.count} movimientos`);
      });
    }

    // ============================================
    // RESUMEN FINAL
    // ============================================
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📊 RESUMEN DE VALIDACIÓN');
    console.log('═══════════════════════════════════════════════════════════\n');

    const scores = [
      { name: 'Movimientos Huérfanos', score: orphanMovements.length === 0 ? 100 : 0, max: 25 },
      { name: 'Balance de Cantidades', score: quantityMismatches.length === 0 ? 100 : 0, max: 25 },
      { name: 'Consistencia de Timestamps', score: invalidDates.length === 0 ? 100 : 0, max: 25 },
      { name: 'Sin Duplicados', score: duplicateMovements.length === 0 ? 100 : 0, max: 25 },
    ];

    const totalScore = scores.reduce((sum, s) => sum + (s.score / 100 * s.max), 0);

    scores.forEach(s => {
      const status = s.score === 100 ? '✅' : '⚠️ ';
      console.log(`${status} ${s.name}: ${s.score}/100`);
    });

    console.log(`\n📈 PUNTUACIÓN TOTAL: ${totalScore}/100\n`);

    if (totalScore === 100) {
      console.log('🎉 EXCELENTE: Todas las correcciones aplicadas correctamente!\n');
    } else if (totalScore >= 75) {
      console.log('✅ BUENO: La mayoría de correcciones se aplicaron correctamente.\n');
    } else {
      console.log('⚠️  INCOMPLETO: Aún hay problemas por resolver.\n');
    }

    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error en validación:', error);
  }

  await prisma.$disconnect();
}

validateFixes().catch(console.error);
