# 🚀 CONFIGURACIÓN DE ENTORNOS

## 📝 VARIABLES DE ENTORNO PARA PRODUCCIÓN

### .env.production
```bash
# Base de datos de producción
DATABASE_URL="postgresql://user:password@host:port/database"

# Configuración de Prisma para producción
PRISMA_QUERY_ENGINE_BINARY_PATH="/app/node_modules/.prisma/client/query_engine-rhel-openssl-1.0.x"

# Configuración de logging
LOG_LEVEL="error"
NODE_ENV="production"

# Configuración de pool de conexiones
DATABASE_POOL_SIZE=10
DATABASE_CONNECTION_TIMEOUT=10000
```

### .env.staging
```bash
# Base de datos de staging
DATABASE_URL="postgresql://user:password@staging-host:port/database"

# Configuración de Prisma para staging  
LOG_LEVEL="warn"
NODE_ENV="staging"
```

## 🔧 CONFIGURACIÓN DE PRISMA PARA PRODUCCIÓN

### prisma/schema.prisma - Configuración optimizada
```prisma
generator client {
  provider = "prisma-client-js"
  // Optimizaciones para producción
  binaryTargets = ["native", "rhel-openssl-1.0.x"]
  previewFeatures = ["relationJoins", "omitApi"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  // Pool de conexiones optimizado
  shadowDatabaseUrl = env("SHADOW_DATABASE_URL")
}
```

## 📋 CHECKLIST PRE-DEPLOY

### ✅ ANTES DEL DEPLOY:
- [ ] Backup completo de la base de datos
- [ ] Verificar que todas las migraciones están committeadas
- [ ] Probar migraciones en staging
- [ ] Verificar variables de entorno
- [ ] Confirmar pool de conexiones
- [ ] Revisar logs de aplicación

### ✅ DURANTE EL DEPLOY:
- [ ] Usar solo `prisma migrate deploy`
- [ ] Verificar estado con `prisma migrate status`
- [ ] Confirmar funcionamiento de endpoints críticos
- [ ] Verificar métricas de performance

### ✅ POST-DEPLOY:
- [ ] Verificar logs de aplicación
- [ ] Confirmar que los índices existen
- [ ] Probar operaciones CRUD críticas
- [ ] Monitorear métricas de base de datos

## 🚨 PLAN DE ROLLBACK

### SI ALGO SALE MAL:
1. **Revertir código**: Deploy de la versión anterior
2. **Revertir migraciones**: 
   ```bash
   # Solo si es absolutamente necesario
   npx prisma migrate resolve --rolled-back 20250925000001_performance_indexes
   ```
3. **Restaurar backup**: Si hay corrupción de datos
4. **Notificar equipo**: Comunicar el problema

## 📊 MONITOREO POST-DEPLOY

### Queries para verificar salud:
```sql
-- Verificar índices
SELECT schemaname, tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- Verificar performance
SELECT query, mean_time, calls 
FROM pg_stat_statements 
WHERE query LIKE '%DeliveryBatch%' 
ORDER BY mean_time DESC;

-- Verificar conexiones activas
SELECT count(*) as active_connections 
FROM pg_stat_activity 
WHERE state = 'active';
```