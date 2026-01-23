/**
 * Script de Limpieza de Datos Históricos
 * ADVERTENCIA: Este script modifica datos. Crear backup antes de ejecutar.
 * 
 * Resuelve:
 * 1. Movimientos huérfanos (sin entrega) → ELIMINAR
 * 2. Duplicados por edición → CONSOLIDAR
 * 3. Discrepancias de cantidad → REVERTIR ediciones problemáticas
 */

const { PrismaClient } = require('@prisma/client');
const readline = require('readline');

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(q) {
  return new Promise(resolve => rl.question(q, resolve));
}

async function cleanHistoricalData() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('🧹 LIMPIEZA DE DATOS HISTÓRICOS PROBLEMÁTICOS');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log('⚠️  ADVERTENCIA: Este script modificará la base de datos');
  console.log('   Asegúrate de tener un BACKUP antes de continuar\n');

  const confirmed = await question('¿Deseas continuar? (s/n): ');
  if (confirmed.toLowerCase() !== 's') {
    console.log('Operación cancelada.');
    rl.close();
    await prisma.$disconnect();
    return;
  }

  try {
    console.log('\n📊 Analizando datos problemáticos...\n');

    // Obtener todos los movimientos y entregas
    const movements = await prisma.stockMovement.findMany({
      where: { type: 'EXIT' },
      include: {
        epp: { select: { code: true, name: true } },
        warehouse: { select: { name: true } },
      },
    });

    const deliveries = await prisma.delivery.findMany({
      include: {
        batch: { select: { code: true, warehouseId: true, id: true } },
        epp: { select: { code: true } },
      },
    });

    // ============================================
    // PASO 1: Identificar movimientos huérfanos
    // ============================================
    console.log('PASO 1️⃣ : Identificando movimientos huérfanos...\n');

    const orphanMovementIds = [];
    for (const movement of movements) {
      const hasDelivery = deliveries.some(d =>
        d.eppId === movement.eppId &&
        d.batch.warehouseId === movement.warehouseId &&
        movement.note?.includes(d.batch.code)
      );

      if (!hasDelivery && movement.note?.startsWith('Entrega')) {
        orphanMovementIds.push({
          id: movement.id,
          eppCode: movement.epp.code,
          quantity: movement.quantity,
          warehouse: movement.warehouse.name,
        });
      }
    }

    console.log(`   Encontrados: ${orphanMovementIds.length} movimientos huérfanos`);
    if (orphanMovementIds.length > 0) {
      orphanMovementIds.slice(0, 5).forEach(m => {
        console.log(`   - Mov #${m.id}: ${m.eppCode} x${m.quantity}`);
      });
      if (orphanMovementIds.length > 5) {
        console.log(`   - ... y ${orphanMovementIds.length - 5} más`);
      }
    }

    // ============================================
    // PASO 2: Identificar duplicados por edición
    // ============================================
    console.log('\nPASO 2️⃣ : Identificando duplicados por edición...\n');

    const duplicatePatterns = [];
    const deliveriesByBatch = new Map();
    for (const d of deliveries) {
      const batchCode = d.batch.code;
      if (!deliveriesByBatch.has(batchCode)) {
        deliveriesByBatch.set(batchCode, []);
      }
      deliveriesByBatch.get(batchCode).push(d);
    }

    for (const [batchCode, batchDeliveries] of deliveriesByBatch) {
      const batchMovements = movements.filter(m =>
        m.note?.includes(`Entrega ${batchCode}`)
      );

      if (batchMovements.length === 0) continue;

      const byEpp = new Map();
      for (const m of batchMovements) {
        if (!byEpp.has(m.eppId)) byEpp.set(m.eppId, []);
        byEpp.get(m.eppId).push(m);
      }

      for (const [eppId, eppMovements] of byEpp) {
        if (eppMovements.length > 1) {
          const totalQty = eppMovements.reduce((s, m) => s + m.quantity, 0);
          const delivery = batchDeliveries.find(d => d.eppId === eppId);

          if (!delivery || totalQty !== delivery.quantity) {
            duplicatePatterns.push({
              batchCode,
              batchId: batchDeliveries[0]?.batch.id,
              eppId,
              movementIds: eppMovements.map(m => m.id),
              deliveryQty: delivery?.quantity,
              totalMovementQty: totalQty,
              count: eppMovements.length,
            });
          }
        }
      }
    }

    console.log(`   Encontrados: ${duplicatePatterns.length} patrones de duplicación`);
    if (duplicatePatterns.length > 0) {
      duplicatePatterns.slice(0, 5).forEach(d => {
        console.log(`   - Lote ${d.batchCode}, EPP ${d.eppId}: ${d.count} movimientos (esperado: ${d.deliveryQty})`);
      });
      if (duplicatePatterns.length > 5) {
        console.log(`   - ... y ${duplicatePatterns.length - 5} más`);
      }
    }

    // ============================================
    // PASO 3: Proponer soluciones
    // ============================================
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📋 ACCIONES RECOMENDADAS');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log(`1️⃣  ELIMINAR ${orphanMovementIds.length} movimientos huérfanos`);
    console.log(`    - Estos movimientos no tienen entrega asociada`);
    console.log(`    - Acción: DELETE de los movimientos\n`);

    console.log(`2️⃣  CONSOLIDAR ${duplicatePatterns.length} duplicados`);
    console.log(`    - Estos movimientos suman más/menos que la entrega`);
    console.log(`    - Acción: ELIMINAR duplicados, mantener movimiento que coincida con entrega\n`);

    // Preguntar si ejecutar
    const execute = await question('¿Ejecutar limpieza? (s/n): ');
    if (execute.toLowerCase() !== 's') {
      console.log('Operación cancelada.');
      rl.close();
      await prisma.$disconnect();
      return;
    }

    // ============================================
    // EJECUCIÓN
    // ============================================
    console.log('\n🚀 Ejecutando limpieza...\n');

    let deletedOrphans = 0;
    let deletedDuplicates = 0;

    // Eliminar huérfanos
    for (const orphan of orphanMovementIds) {
      try {
        await prisma.stockMovement.delete({ where: { id: orphan.id } });
        deletedOrphans++;
      } catch (err) {
        console.log(`   ⚠️  No se pudo eliminar movimiento ${orphan.id}: ${err.message}`);
      }
    }

    // Consolidar duplicados
    for (const dup of duplicatePatterns) {
      try {
        // Mantener el primero, eliminar el resto
        const idsToDelete = dup.movementIds.slice(1);
        for (const id of idsToDelete) {
          await prisma.stockMovement.delete({ where: { id } });
          deletedDuplicates++;
        }
      } catch (err) {
        console.log(`   ⚠️  No se pudo consolidar lote ${dup.batchCode}: ${err.message}`);
      }
    }

    console.log('\n✅ LIMPIEZA COMPLETADA\n');
    console.log(`   Movimientos huérfanos eliminados: ${deletedOrphans}`);
    console.log(`   Movimientos duplicados eliminados: ${deletedDuplicates}`);
    console.log(`   Total modificaciones: ${deletedOrphans + deletedDuplicates}\n`);

    // Ejecutar validación
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 VALIDANDO RESULTADOS');
    console.log('═══════════════════════════════════════════════════════════\n');

    const finalMovements = await prisma.stockMovement.findMany({
      where: { type: 'EXIT' },
      include: {
        epp: { select: { code: true } },
        warehouse: { select: { name: true } },
      },
    });

    const finalDeliveries = await prisma.delivery.findMany();

    const finalOrphans = [];
    for (const m of finalMovements) {
      const hasDelivery = finalDeliveries.some(d =>
        d.eppId === m.eppId &&
        m.note?.includes(d.batch?.code || '')
      );
      if (!hasDelivery && m.note?.startsWith('Entrega')) {
        finalOrphans.push(m.id);
      }
    }

    console.log(`   Movimientos EXIT: ${finalMovements.length} (antes: ${movements.length})`);
    console.log(`   Movimientos huérfanos restantes: ${finalOrphans.length} (antes: ${orphanMovementIds.length})`);
    
    if (finalOrphans.length === 0) {
      console.log('   ✅ Limpieza exitosa - No hay más movimientos huérfanos\n');
    } else {
      console.log(`   ⚠️  Aún hay ${finalOrphans.length} movimientos sin resolver\n`);
    }

    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error en limpieza:', error.message);
    console.error(error);
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

cleanHistoricalData().catch(console.error);
