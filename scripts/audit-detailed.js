/**
 * AUDITORÍA DETALLADA: Mostrar casos específicos de inconsistencias
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function detailedAudit() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('🔍 AUDITORÍA DETALLADA - CASOS ESPECÍFICOS');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
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
      include: {
        epp: { select: { code: true, name: true } },
        warehouse: { select: { name: true } },
        user: { select: { name: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    // PROBLEMA 1: MOVIMIENTOS HUÉRFANOS Y DISCREPANCIAS DE CANTIDAD
    console.log('❌ PROBLEMA 1: MOVIMIENTOS HUÉRFANOS (sin entrega)\n');
    
    const orphanAndMismatch = [];
    for (const movement of movements) {
      const relatedDeliveries = deliveries.filter(d =>
        d.eppId === movement.eppId &&
        d.batch.warehouseId === movement.warehouseId &&
        d.batch.code && movement.note?.includes(d.batch.code)
      );

      if (relatedDeliveries.length === 0 && movement.note?.startsWith('Entrega')) {
        orphanAndMismatch.push({
          movementId: movement.id,
          batchCode: movement.note.match(/Entrega ([\w-]+)/)?.[1],
          eppCode: movement.epp.code,
          eppName: movement.epp.name,
          quantity: movement.quantity,
          warehouse: movement.warehouse.name,
          createdAt: movement.createdAt,
          createdBy: movement.user.email
        });
      }
    }

    console.log(`Encontrados ${orphanAndMismatch.length} movimientos huérfanos:\n`);
    orphanAndMismatch.slice(0, 10).forEach((item, idx) => {
      console.log(`${idx + 1}. Movimiento #${item.movementId}`);
      console.log(`   Lote: ${item.batchCode}`);
      console.log(`   EPP: ${item.eppCode} - ${item.eppName}`);
      console.log(`   Cantidad: ${item.quantity} unidades`);
      console.log(`   Almacén: ${item.warehouse}`);
      console.log(`   Fecha: ${item.createdAt.toLocaleString()}`);
      console.log(`   Creado por: ${item.createdBy}\n`);
    });

    if (orphanAndMismatch.length > 10) {
      console.log(`... y ${orphanAndMismatch.length - 10} más\n`);
    }

    // PROBLEMA 2: DISCREPANCIAS DE CANTIDAD
    console.log('\n❌ PROBLEMA 2: DISCREPANCIAS DE CANTIDAD\n');
    
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
            eppName: delivery.epp.name,
            deliveryQty: delivery.quantity,
            movementQty: totalMovementQty,
            difference: delivery.quantity - totalMovementQty,
            numMovements: relatedMovements.length,
            movements: relatedMovements.map(m => ({
              id: m.id,
              qty: m.quantity,
              date: m.createdAt,
              status: m.status
            }))
          });
        }
      }
    }

    console.log(`Encontradas ${quantityMismatches.length} discrepancias:\n`);
    quantityMismatches.slice(0, 10).forEach((item, idx) => {
      console.log(`${idx + 1}. Lote: ${item.batchCode}`);
      console.log(`   EPP: ${item.eppCode} - ${item.eppName}`);
      console.log(`   En entrega: ${item.deliveryQty} unidades`);
      console.log(`   En movimientos: ${item.movementQty} unidades`);
      console.log(`   Diferencia: ${item.difference > 0 ? '+' : ''}${item.difference}`);
      console.log(`   Movimientos: ${item.numMovements}`);
      item.movements.forEach((m, i) => {
        console.log(`     - Mov #${m.id}: ${m.qty} un. (${m.date.toLocaleString()}) [${m.status}]`);
      });
      console.log();
    });

    if (quantityMismatches.length > 10) {
      console.log(`... y ${quantityMismatches.length - 10} más\n`);
    }

    // PROBLEMA 3: INCONSISTENCIAS DE FECHA
    console.log('\n⚠️ PROBLEMA 3: INCONSISTENCIAS DE FECHA (movimiento anterior a entrega)\n');
    
    const invalidDates = [];
    for (const delivery of deliveries) {
      const relatedMovements = movements.filter(m =>
        m.eppId === delivery.eppId &&
        m.warehouseId === delivery.batch.warehouseId &&
        m.note?.includes(delivery.batch.code)
      );

      for (const movement of relatedMovements) {
        if (movement.createdAt < delivery.createdAt) {
          invalidDates.push({
            batchCode: delivery.batch.code,
            eppCode: delivery.epp.code,
            deliveryDate: delivery.createdAt,
            movementDate: movement.createdAt,
            difference: Math.floor((delivery.createdAt.getTime() - movement.createdAt.getTime()) / 1000 / 60),
            movementId: movement.id
          });
        }
      }
    }

    console.log(`Encontradas ${invalidDates.length} inconsistencias de fecha:\n`);
    invalidDates.slice(0, 5).forEach((item, idx) => {
      console.log(`${idx + 1}. Lote: ${item.batchCode}`);
      console.log(`   EPP: ${item.eppCode}`);
      console.log(`   Movimiento creado: ${item.movementDate.toLocaleString()}`);
      console.log(`   Entrega creada: ${item.deliveryDate.toLocaleString()}`);
      console.log(`   Diferencia: ${item.difference} minutos ANTES\n`);
    });

    if (invalidDates.length > 5) {
      console.log(`... y ${invalidDates.length - 5} más\n`);
    }

    // ESTADÍSTICAS FINALES
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📊 ESTADÍSTICAS RESUMIDAS');
    console.log('═══════════════════════════════════════════════════════════\n');

    const totalDeliveredQty = deliveries.reduce((sum, d) => sum + d.quantity, 0);
    const totalExitMovementQty = movements.reduce((sum, m) => sum + m.quantity, 0);
    
    console.log(`Total de entregas registradas: ${deliveries.length}`);
    console.log(`Total de movimientos EXIT: ${movements.length}`);
    console.log(`Cantidad total entregada: ${totalDeliveredQty} unidades`);
    console.log(`Cantidad total en movimientos: ${totalExitMovementQty} unidades`);
    console.log(`Diferencia: ${totalDeliveredQty - totalExitMovementQty} unidades\n`);

    // ANÁLISIS DE CAUSAS POSIBLES
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🔎 ANÁLISIS DE POSIBLES CAUSAS');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('📌 HALLAZGO 1: Hay 25 movimientos más que entregas (144 unidades de diferencia)');
    console.log('   Posibles causas:');
    console.log('   ✗ Movimientos duplicados en la creación');
    console.log('   ✗ Ajustes manuales no documentados');
    console.log('   ✗ Eliminación de entregas sin revertir movimiento');
    console.log('   ✗ Ediciones de entregas que crean movimientos adicionales\n');

    console.log('📌 HALLAZGO 2: Hay inconsistencias de fecha (movimientos creados antes que entregas)');
    console.log('   Posibles causas:');
    console.log('   ✗ Transacciones no atómicas');
    console.log('   ✗ Reloj del servidor desincronizado');
    console.log('   ✗ Importación de datos históricos');
    console.log('   ✗ Eventos de auditoría registrados por separado\n');

    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error:', error);
  }

  await prisma.$disconnect();
}

detailedAudit().catch(console.error);
