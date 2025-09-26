#!/bin/bash
# scripts/vercel-build.sh
# Script seguro para build en Vercel

set -e

echo "🔧 Iniciando build para Vercel..."

# Verificar que las variables de entorno estén configuradas
if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL no está configurada"
  exit 1
fi

echo "📦 Generando cliente Prisma..."
npx prisma generate

echo "🔍 Verificando estado de migraciones..."
npx prisma migrate status || {
  echo "⚠️  Advertencia: Problemas con migraciones detectados"
  echo "🔄 Intentando resolver..."
}

echo "🚀 Aplicando migraciones pendientes..."
npx prisma migrate deploy || {
  echo "❌ Error aplicando migraciones"
  echo "🔍 Verificando estado..."
  npx prisma migrate status
  exit 1
}

echo "✅ Migraciones aplicadas correctamente"

echo "🏗️  Construyendo aplicación Next.js..."
next build

echo "🎉 Build completado exitosamente!"