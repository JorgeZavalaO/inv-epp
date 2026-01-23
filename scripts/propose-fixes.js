/**
 * Script de Auto-Corrección
 * Identifica duplicados y propone eliminaciones seguras
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function proposeFixes() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('🔧 PROPUESTAS DE CORRECCIÓN AUTOMÁTICA');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    // 1. Encontrar movimientos potencialmente duplicados
    console.log('1️⃣  Analizando movimientos para eliminar...\n');

    const problemLots = await prisma.deliveryBatch.findMany({
      where: {
        deliveries: {
          some: {}
        }
      },
      include: {
        deliveries: {
          include: {
            epp: { select: { code: true, name: true } }
          }
        }
      }
    });

    const corrections = [];

    for (const batch of problemLots) {
      for (const delivery of batch.deliveries) {
        const movements = await prisma.stockMovement.findMany({
          where: {
            type: 'EXIT',
            eppId: delivery.eppId,
            warehouseId: batch.warehouseId,
            note: { contains: batch.code }
          },
          orderBy: { createdAt: 'asc' }
        });

        const totalMovementQty = movements.reduce((sum, m) => sum + m.quantity, 0);

        if (movements.length > 1) {
          corrections.push({
            type: 'MULTIPLE_MOVEMENTS',
            batchCode: batch.code,
            eppCode: delivery.epp.code,
            eppName: delivery.epp.name,
            deliveryQty: delivery.quantity,
            totalMovementQty,
            movements: movements.map(m => ({
              id: m.id,
              qty: m.quantity,
              createdAt: m.createdAt,
              approvedAt: m.approvedAt,
              status: m.status
            })),
            action: movements.length > 1 
              ? `Consolidar ${movements.length} movimientos en 1`
              : 'OK',
            idsToDelete: movements.slice(0, -1).map(m => m.id),
            sqlDelete: movements.length > 1
              ? `DELETE FROM "StockMovement" WHERE id IN (${movements.slice(0, -1).map(m => m.id).join(',')})`
              : null
          });
        }
      }
    }

    console.log(`Encontrados ${corrections.length} casos de múltiples movimientos:\n`);

    // Categorizar por severidad
    const highRisk = corrections.filter(c => 
      c.movements.some(m => m.status !== 'APPROVED') ||
      c.deliveryQty !== c.totalMovementQty
    );

    const lowRisk = corrections.filter(c =>
      c.movements.every(m => m.status === 'APPROVED') &&
      c.deliveryQty === c.totalMovementQty
    );

    console.log(`  🔴 Alto riesgo (cantidad no coincide o estado raro): ${highRisk.length}`);
    console.log(`  🟡 Bajo riesgo (aprobados y cantidad OK): ${lowRisk.length}\n`);

    // Mostrar casos de bajo riesgo (seguros de eliminar)
    if (lowRisk.length > 0) {
      console.log('═══════════════════════════════════════════════════════════');
      console.log('✅ MOVIMIENTOS SEGUROS DE ELIMINAR (bajo riesgo)');
      console.log('═══════════════════════════════════════════════════════════\n');

      const safeDeletes = [];

      lowRisk.slice(0, 10).forEach((item, idx) => {
        const keepId = item.movements[item.movements.length - 1].id;
        const deleteIds = item.movements.slice(0, -1).map(m => m.id);

        console.log(`${idx + 1}. Lote: ${item.batchCode} | EPP: ${item.eppCode}`);
        console.log(`   Cantidad: ${item.deliveryQty} unidades`);
        console.log(`   Movimientos: ${item.movements.length} (consolidar en 1)`);
        console.log(`   Eliminar IDs: [${deleteIds.join(', ')}]`);
        console.log(`   Mantener ID: ${keepId}`);
        console.log(`   SQL: ${item.sqlDelete}\n`);

        safeDeletes.push(...deleteIds);
      });

      console.log(`\n📊 Total de IDs a eliminar (bajo riesgo): ${safeDeletes.length}`);
      console.log(`   DELETE FROM "StockMovement" WHERE id IN (${safeDeletes.join(',')});\n`);
    }

    // Mostrar casos de alto riesgo (necesitan revisión manual)
    if (highRisk.length > 0) {
      console.log('\n═══════════════════════════════════════════════════════════');
      console.log('⚠️  MOVIMIENTOS QUE REQUIEREN REVISIÓN MANUAL (alto riesgo)');
      console.log('═══════════════════════════════════════════════════════════\n');

      highRisk.slice(0, 10).forEach((item, idx) => {
        console.log(`${idx + 1}. Lote: ${item.batchCode} | EPP: ${item.eppCode}`);
        console.log(`   En entrega: ${item.deliveryQty} unidades`);
        console.log(`   En movimientos: ${item.totalMovementQty} unidades`);
        console.log(`   Diferencia: ${item.deliveryQty - item.totalMovementQty}`);
        console.log(`   Movimientos:`);
        item.movements.forEach(m => {
          console.log(`     • ID #${m.id}: ${m.qty} un. | ${m.status} | ${m.createdAt.toLocaleString()}`);
        });
        console.log(`   ⚠️  REQUIERE DECISIÓN MANUAL\n`);
      });

      if (highRisk.length > 10) {
        console.log(`... y ${highRisk.length - 10} casos más\n`);
      }
    }

    // 2. Movimientos huérfanos
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('2️⃣  Analizando movimientos huérfanos...\n');

    const movements = await prisma.stockMovement.findMany({
      where: { type: 'EXIT', note: { startsWith: 'Entrega' } },
      select: { id: true, eppId: true, warehouseId: true, quantity: true, note: true, createdAt: true }
    });

    const orphans = [];

    for (const movement of movements) {
      const batchCode = movement.note.split(' ')[1];
      const delivery = await prisma.delivery.findFirst({
        where: {
          eppId: movement.eppId,
          batch: {
            warehouseId: movement.warehouseId,
            code: batchCode
          }
        }
      });

      if (!delivery) {
        orphans.push({
          movementId: movement.id,
          batchCode,
          eppId: movement.eppId,
          quantity: movement.quantity,
          createdAt: movement.createdAt,
          shouldDelete: true
        });
      }
    }

    if (orphans.length > 0) {
      console.log(`Encontrados ${orphans.length} movimientos huérfanos:\n`);

      const orphanIds = orphans.map(o => o.movementId);
      console.log(`DELETE FROM "StockMovement" WHERE id IN (${orphanIds.join(',')});\n`);

      orphans.slice(0, 5).forEach((item, idx) => {
        console.log(`${idx + 1}. ID #${item.movementId} | Lote: ${item.batchCode} | ${item.quantity} un.`);
      });

      if (orphans.length > 5) {
        console.log(`... y ${orphans.length - 5} más`);
      }
    }

    // 3. Resumen de acciones
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📋 RESUMEN DE ACCIONES RECOMENDADAS');
    console.log('═══════════════════════════════════════════════════════════\n');

    const safeDeleteCount = lowRisk.reduce((sum, item) => sum + item.movements.length - 1, 0);
    const manualReviewCount = highRisk.length;
    const orphanDeleteCount = orphans.length;

    console.log(`1. Movimientos duplicados (bajo riesgo) para eliminar: ${safeDeleteCount}`);
    console.log(`2. Casos que requieren revisión manual: ${manualReviewCount}`);
    console.log(`3. Movimientos huérfanos para eliminar: ${orphanDeleteCount}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`TOTAL de movimientos a eliminar: ${safeDeleteCount + orphanDeleteCount}\n`);

    console.log('⏰ PASO A PASO:\n');
    console.log('1. Ejecutar SQL para eliminar movimientos de bajo riesgo ↑');
    console.log('2. Ejecutar SQL para eliminar movimientos huérfanos ↑');
    console.log('3. Revisar manualmente los ${manualReviewCount} casos de alto riesgo');
    console.log('4. Ejecutar auditoría de nuevo: node scripts/audit-deliveries-vs-movements.js');
    console.log('5. Verificar que todas las inconsistencias se resolvieron\n');

  } catch (error) {
    console.error('❌ Error:', error);
  }

  console.log('═══════════════════════════════════════════════════════════\n');

  await prisma.$disconnect();
}

proposeFixes().catch(console.error);
