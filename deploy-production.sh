#!/bin/bash
# deploy-production.sh - Script seguro para deploy en producción

set -e  # Exit on error

echo "🔍 Verificando estado de migraciones..."
npx prisma migrate status

echo "📋 Verificando conexión a base de datos..."
npx prisma db pull --print > /dev/null

echo "📦 Generando cliente Prisma..."
npx prisma generate

echo "🚀 Aplicando migraciones pendientes..."
npx prisma migrate deploy

echo "🏗️  Construyendo aplicación..."
npm run build

echo "✅ Verificando deployment..."
npx prisma migrate status

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