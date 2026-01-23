// scripts/verify-indexes.js
// Verifica índices críticos y una consulta de performance.
// Opciones:
//  --json               Salida en JSON
//  --threshold=MS       Umbral de lentitud para la consulta crítica (default: 1000ms)
//  --extra=idx1,idx2    Índices adicionales a verificar (coma-separado)

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const thresholdArg = args.find((a) => a.startsWith('--threshold='));
const THRESHOLD_MS = thresholdArg ? parseInt(thresholdArg.split('=')[1], 10) : 1000;
const extraArg = args.find((a) => a.startsWith('--extra='));
const EXTRA_INDEXES = extraArg ? extraArg.split('=')[1].split(',').filter(Boolean) : [];

const REQUIRED_INDEXES = [
  'idx_delivery_batch_date_warehouse',
  'idx_delivery_epp_batch',
  'idx_collaborator_location_name',
  'idx_stock_movement_type_date',
  'idx_delivery_date_epp',
  'idx_return_item_batch_epp',
  'idx_epp_stock_warehouse_epp',
  'idx_epp_category_name',
  'idx_request_status_date',
  ...EXTRA_INDEXES,
];

function logHuman(msg) {
  if (!asJson) console.log(msg);
}

async function verifyIndexes() {
  try {
    logHuman('🔍 Verificando índices críticos...');

    const result = await prisma.$queryRaw`
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
      AND indexname = ANY(${REQUIRED_INDEXES})
    `;

    const existingIndexes = result.map((row) => row.indexname);
    const missingIndexes = REQUIRED_INDEXES.filter((idx) => !existingIndexes.includes(idx));

    // Performance de consulta crítica
    logHuman('🚀 Verificando performance de consulta crítica...');
    const start = Date.now();

    await prisma.deliveryBatch.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 días
        },
      },
      take: 20,
      orderBy: { createdAt: 'desc' },
    });

    const duration = Date.now() - start;

    if (asJson) {
      const payload = {
        checkedCount: REQUIRED_INDEXES.length,
        existingIndexes,
        missingIndexes,
        performance: {
          durationMs: duration,
          thresholdMs: THRESHOLD_MS,
          slow: duration > THRESHOLD_MS,
        },
      };
      console.log(JSON.stringify(payload, null, 2));
    } else {
      if (missingIndexes.length === 0) {
        console.log('✅ Todos los índices críticos están presentes');
        console.log(`📊 Índices verificados: ${existingIndexes.length}/${REQUIRED_INDEXES.length}`);
      } else {
        console.log('⚠️  Índices faltantes:', missingIndexes);
      }
      console.log(`⚡ Consulta ejecutada en ${duration}ms (umbral: ${THRESHOLD_MS}ms)`);
      if (duration > THRESHOLD_MS) {
        console.log('⚠️  Consulta lenta detectada. Revisar índices y plan de ejecución.');
      } else {
        console.log('✅ Performance de consulta OK');
      }
    }

    // Códigos de salida:
    // 0 = OK; 2 = faltan índices; 3 = consulta lenta
    if (missingIndexes.length > 0) {
      process.exit(2);
    }
    if (duration > THRESHOLD_MS) {
      process.exit(3);
    }
  } catch (error) {
    console.error('❌ Error verificando índices:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifyIndexes();