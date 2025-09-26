// scripts/verify-indexes.js
// Script para verificar que los índices críticos existan después del deploy

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

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
  'idx_user_clerk_id'
];

async function verifyIndexes() {
  try {
    console.log('🔍 Verificando índices críticos...');
    
    const result = await prisma.$queryRaw`
      SELECT indexname 
      FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND indexname = ANY(${REQUIRED_INDEXES})
    `;
    
    const existingIndexes = result.map(row => row.indexname);
    const missingIndexes = REQUIRED_INDEXES.filter(idx => !existingIndexes.includes(idx));
    
    if (missingIndexes.length === 0) {
      console.log('✅ Todos los índices críticos están presentes');
      console.log(`📊 Índices verificados: ${existingIndexes.length}/${REQUIRED_INDEXES.length}`);
    } else {
      console.log('⚠️  Índices faltantes:', missingIndexes);
      process.exit(1);
    }
    
    // Verificar performance de consulta crítica
    console.log('🚀 Verificando performance de consulta crítica...');
    const start = Date.now();
    
    await prisma.deliveryBatch.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 días
        }
      },
      take: 20,
      orderBy: { createdAt: 'desc' }
    });
    
    const duration = Date.now() - start;
    console.log(`⚡ Consulta ejecutada en ${duration}ms`);
    
    if (duration > 1000) {
      console.log('⚠️  Consulta lenta detectada (>1s). Revisar índices.');
    } else {
      console.log('✅ Performance de consulta OK');
    }
    
  } catch (error) {
    console.error('❌ Error verificando índices:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifyIndexes();