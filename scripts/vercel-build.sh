#!/bin/bash
# scripts/vercel-build.sh
# Script seguro para build en Vercel

set -euo pipefail

echo "🔧 Iniciando build para Vercel..."

# Verificar que las variables de entorno estén configuradas
if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL no está configurada"
  exit 1
fi

# Detectar entorno de Vercel
VERCEL_ENVIRONMENT="${VERCEL_ENV:-}"
echo "ℹ️  VERCEL_ENV=${VERCEL_ENVIRONMENT:-desconocido}"

echo "📦 Generando cliente Prisma..."
pnpm exec prisma generate

# Permitir saltar migraciones en build si se define SKIP_PRISMA_MIGRATE (útil en preview)
if [ "${VERCEL_ENVIRONMENT}" = "preview" ]; then
  echo "⏭️  Entorno de preview detectado, se saltan migraciones (seguro para PRs)"
elif [ "${SKIP_PRISMA_MIGRATE:-}" = "1" ]; then
  echo "⏭️  Saltando prisma migrate deploy por configuración (SKIP_PRISMA_MIGRATE=1)"
else
  # En producción, preferimos DIRECT_DATABASE_URL (conexión directa sin pooler)
  if [ "${VERCEL_ENVIRONMENT}" = "production" ]; then
    if [ -z "${DIRECT_DATABASE_URL:-}" ]; then
      # Si DATABASE_URL ya es directa (no contiene "-pooler"), permitimos continuar
      if echo "$DATABASE_URL" | grep -q "-pooler"; then
        echo "❌ ERROR: En producción, DIRECT_DATABASE_URL es requerido para ejecutar migraciones sin pooler (Neon)."
        echo "👉 Configura DIRECT_DATABASE_URL con el host directo de Neon (sin -pooler)."
        exit 1
      else
        echo "✅ DATABASE_URL parece ser directa (sin -pooler). Continuando sin DIRECT_DATABASE_URL..."
      fi
    fi
  fi

  echo "🔍 Verificando estado de migraciones..."
  pnpm exec prisma migrate status || {
    echo "⚠️  Advertencia: Problemas con migraciones detectados"
    echo "🔄 Intentando resolver..."
  }

  echo "🚀 Aplicando migraciones pendientes..."
  # Aumentar timeout de locking via variable y usar directUrl si existe
  export PRISMA_MIGRATE_ENGINE_ADVISORY_LOCK_TIMEOUT=30000
  pnpm exec prisma migrate deploy || {
    echo "❌ Error aplicando migraciones (posible timeout de advisory lock con pooler)"
    echo "� Reintentando en 5s..."
    sleep 5
    pnpm exec prisma migrate deploy || {
      echo "❌ Falló el segundo intento de migración"
      echo "🔍 Estado de migraciones actual:"
      pnpm exec prisma migrate status || true
      exit 1
    }
  }

  echo "✅ Migraciones aplicadas correctamente"
fi

echo "🏗️  Construyendo aplicación Next.js..."
next build

echo "🎉 Build completado exitosamente!"
