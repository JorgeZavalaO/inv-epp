/**
 * AUDITORÍA: Validar consistencia entre Entregas y Movimientos de Stock
 * 
 * Este script verifica que:
 * 1. Cada entrega tenga un movimiento EXIT correspondiente
 * 2. Los movimientos de salida correspondan a entregas registradas
 * 3. Las cantidades sean consistentes
 * 4. No haya duplicados o movimientos huérfanos
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface DiscrepancyReport {
  type: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  description: string;
  affectedRecords: any[];
  recommendation: string;
}

const report: DiscrepancyReport[] = [];

async function auditDeliveries() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('🔍 AUDITORÍA DE ENTREGAS VS MOVIMIENTOS DE STOCK');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    // 1️⃣ VERIFICAR ENTREGAS SIN MOVIMIENTOS DE SALIDA
    console.log('1️⃣  Buscando entregas sin movimiento de salida...');
    const deliveries = await prisma.delivery.findMany({
      include: {
        batch: {
          select: { code: true, warehouseId: true, createdAt: true }
        },
        epp: { select: { code: true, name: true } }
      }
    });

    const movements = await prisma.stockMovement.findMany({
      where: { type: 'EXIT' },
      select: {
        id: true,
        eppId: true,
        warehouseId: true,
        quantity: true,
        createdAt: true,
        note: true,
        userId: true
      }
    });

    const discrepancies: any[] = [];

    for (const delivery of deliveries) {
      // Buscar movimiento EXIT correspondiente
      const relatedMovement = movements.find(m =>
        m.eppId === delivery.eppId &&
        m.warehouseId === delivery.batch.warehouseId &&
        m.note?.includes(delivery.batch.code)
      );

      if (!relatedMovement) {
        discrepancies.push({
          batchCode: delivery.batch.code,
          eppCode: delivery.epp.code,
          eppName: delivery.epp.name,
          quantity: delivery.quantity,
          createdAt: delivery.createdAt,
          status: 'NO_MOVEMENT'
        });
      }
    }

    if (discrepancies.length > 0) {
      report.push({
        type: 'MISSING_MOVEMENTS',
        severity: 'CRITICAL',
        description: `Se encontraron ${discrepancies.length} entregas sin movimiento de salida`,
        affectedRecords: discrepancies,
        recommendation: 'Crear movimientos EXIT para estas entregas'
      });
      console.log(`   ❌ ${discrepancies.length} entregas sin movimiento`);
    } else {
      console.log('   ✅ Todas las entregas tienen movimiento de salida');
    }

    // 2️⃣ VERIFICAR MOVIMIENTOS EXIT SIN ENTREGA CORRESPONDIENTE
    console.log('\n2️⃣  Buscando movimientos de salida sin entrega...');
    const orphanMovements: any[] = [];

    for (const movement of movements) {
      const relatedDeliveries = deliveries.filter(d =>
        d.eppId === movement.eppId &&
        d.batch.warehouseId === movement.warehouseId &&
        d.batch.code && movement.note?.includes(d.batch.code)
      );

      if (relatedDeliveries.length === 0 && movement.note?.startsWith('Entrega')) {
        orphanMovements.push({
          movementId: movement.id,
          eppId: movement.eppId,
          warehouseId: movement.warehouseId,
          quantity: movement.quantity,
          note: movement.note,
          createdAt: movement.createdAt,
          status: 'ORPHAN'
        });
      }
    }

    if (orphanMovements.length > 0) {
      report.push({
        type: 'ORPHAN_MOVEMENTS',
        severity: 'WARNING',
        description: `Se encontraron ${orphanMovements.length} movimientos de salida sin entrega`,
        affectedRecords: orphanMovements,
        recommendation: 'Revisar y posiblemente eliminar movimientos huérfanos'
      });
      console.log(`   ⚠️  ${orphanMovements.length} movimientos huérfanos`);
    } else {
      console.log('   ✅ No hay movimientos huérfanos');
    }

    // 3️⃣ VERIFICAR INCONSISTENCIAS DE CANTIDAD
    console.log('\n3️⃣  Verificando inconsistencias de cantidad...');
    const quantityMismatches: any[] = [];

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
            movements: relatedMovements.map(m => ({
              id: m.id,
              qty: m.quantity,
              date: m.createdAt
            }))
          });
        }
      }
    }

    if (quantityMismatches.length > 0) {
      report.push({
        type: 'QUANTITY_MISMATCH',
        severity: 'CRITICAL',
        description: `Se encontraron ${quantityMismatches.length} discrepancias de cantidad`,
        affectedRecords: quantityMismatches,
        recommendation: 'Ajustar movimientos para que coincidan con entregas'
      });
      console.log(`   ❌ ${quantityMismatches.length} discrepancias de cantidad`);
    } else {
      console.log('   ✅ Todas las cantidades son consistentes');
    }

    // 4️⃣ VERIFICAR MOVIMIENTOS DUPLICADOS
    console.log('\n4️⃣  Buscando movimientos duplicados...');
    const duplicates: any[] = [];
    const seen = new Map<string, any[]>();

    for (const movement of movements) {
      const key = `${movement.eppId}-${movement.warehouseId}-${movement.quantity}-${movement.note}`;
      if (!seen.has(key)) {
        seen.set(key, []);
      }
      seen.get(key)!.push(movement);
    }

    for (const [, mList] of seen) {
      if (mList.length > 1) {
        // Verificar si son realmente duplicados o diferentes
        const timeSpan = Math.abs(
          mList[0].createdAt.getTime() - mList[mList.length - 1].createdAt.getTime()
        ) / 1000 / 60; // minutos

        if (timeSpan < 5) { // Si fueron creados en menos de 5 minutos
          duplicates.push({
            eppId: mList[0].eppId,
            quantity: mList[0].quantity,
            note: mList[0].note,
            count: mList.length,
            movements: mList.map(m => ({ id: m.id, createdAt: m.createdAt }))
          });
        }
      }
    }

    if (duplicates.length > 0) {
      report.push({
        type: 'DUPLICATE_MOVEMENTS',
        severity: 'WARNING',
        description: `Se encontraron ${duplicates.length} posibles duplicados`,
        affectedRecords: duplicates,
        recommendation: 'Revisar y eliminar duplicados'
      });
      console.log(`   ⚠️  ${duplicates.length} posibles duplicados`);
    } else {
      console.log('   ✅ No hay movimientos duplicados');
    }

    // 5️⃣ VERIFICAR STOCK NEGATIVO EN ALMACENES
    console.log('\n5️⃣  Verificando stocks negativos...');
    const negativeStocks = await prisma.ePPStock.findMany({
      where: { quantity: { lt: 0 } },
      include: {
        epp: { select: { code: true, name: true } },
        warehouse: { select: { name: true } }
      }
    });

    if (negativeStocks.length > 0) {
      report.push({
        type: 'NEGATIVE_STOCK',
        severity: 'CRITICAL',
        description: `Se encontraron ${negativeStocks.length} registros con stock negativo`,
        affectedRecords: negativeStocks.map(s => ({
          eppCode: s.epp.code,
          eppName: s.epp.name,
          warehouse: s.warehouse.name,
          quantity: s.quantity
        })),
        recommendation: 'Ajustar movimientos para corregir stock'
      });
      console.log(`   ❌ ${negativeStocks.length} stocks negativos`);
    } else {
      console.log('   ✅ No hay stocks negativos');
    }

    // 6️⃣ VERIFICAR FECHA DE CREACIÓN DE MOVIMIENTOS
    console.log('\n6️⃣  Verificando fechas de movimientos...');
    const invalidDates: any[] = [];

    for (const delivery of deliveries) {
      const relatedMovements = movements.filter(m =>
        m.eppId === delivery.eppId &&
        m.warehouseId === delivery.batch.warehouseId &&
        m.note?.includes(delivery.batch.code)
      );

      for (const movement of relatedMovements) {
        // El movimiento debe ser posterior o igual a la entrega
        if (movement.createdAt < delivery.createdAt) {
          invalidDates.push({
            batchCode: delivery.batch.code,
            deliveryDate: delivery.createdAt,
            movementDate: movement.createdAt,
            difference: delivery.createdAt.getTime() - movement.createdAt.getTime()
          });
        }
      }
    }

    if (invalidDates.length > 0) {
      report.push({
        type: 'INVALID_DATES',
        severity: 'WARNING',
        description: `Se encontraron ${invalidDates.length} movimientos con fecha anterior a la entrega`,
        affectedRecords: invalidDates,
        recommendation: 'Verificar cronología de registros'
      });
      console.log(`   ⚠️  ${invalidDates.length} inconsistencias de fecha`);
    } else {
      console.log('   ✅ Las fechas son consistentes');
    }

    // 7️⃣ RESUMEN POR TIPO DE ENTREGA
    console.log('\n7️⃣  Estadísticas generales...');
    console.log(`   Total de entregas: ${deliveries.length}`);
    console.log(`   Total de movimientos EXIT: ${movements.length}`);
    console.log(`   Total de lotes de entrega: ${new Set(deliveries.map(d => d.batch.code)).size}`);

    // Calcular totales
    const totalDeliveredQty = deliveries.reduce((sum, d) => sum + d.quantity, 0);
    const totalExitMovementQty = movements.reduce((sum, m) => sum + m.quantity, 0);
    console.log(`   Cantidad total entregada: ${totalDeliveredQty} unidades`);
    console.log(`   Cantidad total en movimientos: ${totalExitMovementQty} unidades`);
    if (totalDeliveredQty !== totalExitMovementQty) {
      console.log(`   ⚠️  DIFERENCIA TOTAL: ${totalDeliveredQty - totalExitMovementQty} unidades`);
    }

  } catch (error) {
    console.error('❌ Error durante la auditoría:', error);
  }

  // MOSTRAR REPORTE FINAL
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📊 REPORTE FINAL');
  console.log('═══════════════════════════════════════════════════════════\n');

  if (report.length === 0) {
    console.log('✅ No se encontraron problemas. Todo está consistente.\n');
  } else {
    report.forEach((item, index) => {
      const icon = item.severity === 'CRITICAL' ? '❌' : item.severity === 'WARNING' ? '⚠️' : 'ℹ️';
      console.log(`${icon} [${item.severity}] ${index + 1}. ${item.type}`);
      console.log(`   ${item.description}`);
      console.log(`   📋 Registros afectados: ${item.affectedRecords.length}`);
      console.log(`   💡 ${item.recommendation}`);
      
      if (item.affectedRecords.length <= 5) {
        console.log('   Detalles:');
        item.affectedRecords.forEach(record => {
          console.log(`     • ${JSON.stringify(record).substring(0, 100)}...`);
        });
      }
      console.log();
    });

    const criticals = report.filter(r => r.severity === 'CRITICAL').length;
    const warnings = report.filter(r => r.severity === 'WARNING').length;
    console.log(`\nResumen: ${criticals} crítico(s), ${warnings} advertencia(s)\n`);
  }

  await prisma.$disconnect();
}

auditDeliveries().catch(console.error);
