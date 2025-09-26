# 🚀 CONFIGURACIÓN PARA VERCEL

## Variables de Entorno Requeridas en Vercel

### 📋 Variables de Producción (Vercel Dashboard)
```bash
# Base de datos
DATABASE_URL=postgresql://user:password@host:port/database

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Vercel específicas
SKIP_ENV_VALIDATION=1
PRISMA_GENERATE_SKIP_AUTOINSTALL=true

# Opcional: Para debugging
DEBUG_PRISMA=false
```

### 🔧 Configuración en Vercel Dashboard:

1. **Project Settings** → **Environment Variables**
2. Agregar cada variable con su valor
3. Seleccionar: **Production**, **Preview**, **Development**
4. **Save**

## 📁 Estructura de Archivos para Deploy

```
inv-epp/
├── vercel.json          # Configuración de Vercel
├── scripts/
│   └── vercel-build.sh  # Script de build personalizado
├── prisma/
│   ├── schema.prisma    # Schema principal
│   └── migrations/      # Migraciones versionadas
└── package.json         # Scripts de build actualizados
```

## 🔄 Flujo de Deploy en Vercel

### Automático (Recomendado):
1. Push a `main` branch
2. Vercel detecta cambios
3. Ejecuta `npm run build:vercel`
4. Aplica migraciones con `prisma migrate deploy`
5. Construye aplicación
6. Deploy exitoso

### Manual (Si es necesario):
```bash
# Local
vercel --prod

# O desde CLI
vercel deploy --prod
```

## 🛡️ Protecciones Implementadas

### ✅ Build Process:
- **Error handling**: Script para si migraciones fallan
- **Status check**: Verifica estado antes de continuar
- **Rollback safe**: Solo usa `migrate deploy` (nunca reset)
- **Timeout protection**: Funciones con límite de 30s

### ✅ Database Safety:
- **No destructive operations**: Solo migraciones incrementales
- **Connection pooling**: Optimizado para serverless
- **Migration locks**: Evita migraciones concurrentes

### ✅ Environment Protection:
- **Required variables**: Build falla si faltan vars críticas
- **Skip validations**: Para builds más rápidos
- **Region optimization**: Deploy en región cercana

## 📊 Monitoreo Post-Deploy

### En Vercel Dashboard:
1. **Functions** → Ver logs de API routes
2. **Analytics** → Monitorear performance
3. **Speed Insights** → Métricas de carga

### Verificación Manual:
```bash
# Verificar que el deploy funcionó
curl https://your-app.vercel.app/api/warehouses

# Verificar health check
curl https://your-app.vercel.app/api/health
```

## 🚨 Troubleshooting

### Si el build falla:

1. **Check logs en Vercel**:
   - Vercel Dashboard → Project → Functions → View Function Logs

2. **Problemas comunes**:
   ```bash
   # Error de migraciones
   → Solution: Verificar DATABASE_URL
   
   # Error de Prisma
   → Solution: npm run prisma:generate local
   
   # Error de build
   → Solution: Verificar que todas las deps estén en package.json
   ```

3. **Reset de deployment**:
   ```bash
   # Solo si es absolutamente necesario
   vercel rollback [deployment-url]
   ```

## 🔧 Optimizaciones para Vercel

### Edge Runtime (Futuro):
```typescript
// app/api/warehouses/route.ts
export const runtime = 'edge'; // Para APIs simples
export const dynamic = 'force-dynamic'; // Para APIs con DB
```

### Streaming (Implementado):
```typescript
// Ya configurado en páginas críticas
export const revalidate = 300; // Cache de 5 minutos
```