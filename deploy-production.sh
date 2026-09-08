#!/bin/bash
# deploy-production.sh - Script seguro para deploy en producción

set -e  # Exit on error

echo "🔍 Verificando estado de migraciones..."
pnpm exec prisma migrate status

echo "📋 Verificando conexión a base de datos..."
pnpm exec prisma db pull --print > /dev/null

echo "📦 Generando cliente Prisma..."
pnpm exec prisma generate

echo "🚀 Aplicando migraciones pendientes..."
pnpm exec prisma migrate deploy

echo "🏗️  Construyendo aplicación..."
pnpm run build

echo "✅ Verificando deployment..."
pnpm exec prisma migrate status

echo "📊 Verificando índices..."
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const result = await prisma.\$queryRaw\`
      SELECT COUNT(*) as count
      FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND indexname LIKE 'idx_%'
    \`;
    console.log(\`✅ Índices encontrados: \${result[0].count}\`);
  } finally {
    await prisma.\$disconnect();
  }
})();
"

echo "🎉 Deploy completado exitosamente!"
