# 🛡️ ESTRATEGIA SEGURA PARA DESPLIEGUE EN PRODUCCIÓN

## ⚠️ IMPORTANTE: NUNCA USAR `prisma migrate reset` EN PRODUCCIÓN

### 📋 PROCESO RECOMENDADO PARA PRODUCCIÓN:

#### 1. **VERIFICAR ESTADO ANTES DEL DEPLOY**
```bash
# En producción, verificar drift
npx prisma migrate status

# Si hay drift, revisar qué está desincronizado
npx prisma db pull --print
```

#### 2. **ESTRATEGIA SEGURA: MIGRATE DEPLOY**
```bash
# ✅ USAR SOLO ESTO EN PRODUCCIÓN
npx prisma migrate deploy

# ✅ O con la variable de entorno
DATABASE_URL=your_prod_url npx prisma migrate deploy
```

#### 3. **SI HAY PROBLEMAS DE DRIFT EN PRODUCCIÓN:**

##### A. **CREAR MIGRACIÓN MANUAL PARA SYNC**
```bash
# 1. Hacer pull del estado actual
npx prisma db pull

# 2. Crear migración de sincronización
npx prisma migrate diff \
  --from-migrations ./prisma/migrations \
  --to-schema-datamodel ./prisma/schema.prisma \
  --script > sync-migration.sql

# 3. Revisar el script antes de aplicar
cat sync-migration.sql

# 4. Aplicar manualmente si es seguro
psql $DATABASE_URL -f sync-migration.sql
```

##### B. **MIGRACIÓN INCREMENTAL SEGURA**
```sql
-- En lugar de DROP/CREATE, usar IF NOT EXISTS
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_delivery_batch_date_warehouse" 
ON "DeliveryBatch" ("createdAt" DESC, "warehouseId");

-- Para índices existentes con nombres diferentes:
DROP INDEX CONCURRENTLY IF EXISTS "old_index_name";
CREATE INDEX CONCURRENTLY IF NOT EXISTS "new_index_name" 
ON "table" ("column");
```

### 🔄 **WORKFLOW RECOMENDADO:**

#### **DESARROLLO:**
1. `prisma migrate dev` - Desarrollo local
2. `prisma migrate reset` - Solo si es necesario (datos de prueba)
3. Commit de migraciones

#### **STAGING:**
1. `prisma migrate deploy` - Aplicar migraciones
2. Verificar que todo funciona
3. `prisma migrate status` - Confirmar estado

#### **PRODUCCIÓN:**
1. **BACKUP COMPLETO** antes del deploy
2. `prisma migrate deploy` - Solo este comando
3. Verificar funcionalidad
4. Rollback plan si hay problemas

### 🚨 **COMANDOS PELIGROSOS EN PRODUCCIÓN:**
```bash
# ❌ NUNCA USAR EN PRODUCCIÓN:
prisma migrate reset     # Borra TODA la data
prisma db push --force   # Puede causar pérdida de datos
prisma migrate dev       # Solo para desarrollo

# ✅ SEGUROS EN PRODUCCIÓN:
prisma migrate deploy    # Solo aplica migraciones pendientes
prisma migrate status    # Solo verifica estado
prisma generate          # Solo regenera cliente
```

### 📊 **VERIFICACIÓN POST-DEPLOY:**
```sql
-- Verificar que los índices se crearon
SELECT schemaname, tablename, indexname, indexdef 
FROM pg_indexes 
WHERE schemaname = 'public' 
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Verificar performance de consultas críticas
EXPLAIN ANALYZE SELECT * FROM "DeliveryBatch" 
WHERE "createdAt" > NOW() - INTERVAL '30 days' 
ORDER BY "createdAt" DESC LIMIT 20;
```

### 🔧 **SCRIPTS DE DEPLOY SEGURO:**
```bash
#!/bin/bash
# deploy-safe.sh

set -e  # Exit on error

echo "🔍 Checking migration status..."
npx prisma migrate status

echo "📦 Generating Prisma client..."
npx prisma generate

echo "🚀 Applying migrations..."
npx prisma migrate deploy

echo "✅ Verifying deployment..."
npx prisma migrate status

echo "🎉 Deploy completed successfully!"
```