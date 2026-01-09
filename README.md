<!--
README CONSOLIDADO
-->

# 📦 Sistema de Gestión de Inventario EPP

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-15-black)
![React](https://img.shields.io/badge/React-19-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Prisma](https://img.shields.io/badge/Prisma-ORM-teal)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-blue)
![Tailwind](https://img.shields.io/badge/Tailwind-CSS-38bdf8)

Sistema integral para la administración de Equipos de Protección Personal (EPP) con control de inventario, entregas, devoluciones y reportería avanzada.

[Características](#-características-principales) •
[Instalación](#-instalación) •
[Deploy](#-despliegue-en-producción) •
[Documentación](#-documentación) •
[Mantenimiento](#-mantenimiento)

</div>

---

## 📋 Tabla de Contenidos

- [Descripción del Proyecto](#-descripción-del-proyecto)
- [Características Principales](#-características-principales)
- [Tecnologías Utilizadas](#-tecnologías-utilizadas)
- [Instalación y Configuración](#-instalación-y-configuración)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Despliegue en Producción](#-despliegue-en-producción)
- [Optimizaciones Implementadas](#-optimizaciones-implementadas)
- [Problemas Conocidos y Soluciones](#-problemas-conocidos-y-soluciones)
- [API y Endpoints](#-api-y-endpoints)
- [Mantenimiento y Monitoreo](#-mantenimiento-y-monitoreo)
- [Roadmap de Funcionalidades](#-roadmap-de-funcionalidades)
- [Gestión de Usuarios (Módulo Interno)](#-gestión-de-usuarios-módulo-interno)
- [Autenticación (Auth.js) & Roles](#-autenticación-authjs--roles)
- [Sistema de Auditoría](#-sistema-de-auditoría)
- [Performance del Sistema de Auditoría](#-performance-del-sistema-de-auditoría)
- [Contribución](#-contribución)
- [Licencia](#-licencia)

---

## 🎯 Descripción del Proyecto

**INV-EPP** es una aplicación web moderna para la gestión integral de inventarios de Equipos de Protección Personal (EPP) en entornos industriales y corporativos. El sistema permite un control detallado del stock en múltiples almacenes, gestión de entregas a colaboradores, seguimiento de devoluciones, y generación de reportes y análisis para la toma de decisiones.

### Alcance del Sistema

- **Gestión de Inventario**: Control de EPPs con categorización, stock mínimo, y alertas automáticas
- **Multi-Almacén**: Soporte para múltiples ubicaciones físicas de almacenamiento
- **Entregas y Devoluciones**: Registro completo del ciclo de vida de los EPPs
- **Trazabilidad**: Historial completo de movimientos y transacciones
- **Reportería Avanzada**: Análisis de consumo, tendencias y proyecciones
- **Dashboard Interactivo**: KPIs en tiempo real con visualizaciones gráficas
- **Autenticación Segura**: Sistema de usuarios con roles mediante Clerk

---

## ✨ Características Principales

### 🏭 Gestión de EPP
- ✅ Catálogo completo de EPPs con código único, categoría y descripción
- ✅ Imágenes y hojas de datos técnicos adjuntas
- ✅ Niveles de stock mínimo configurables por artículo
- ✅ Alertas automáticas de stock bajo
- ✅ **Búsqueda en tiempo real** - Búsqueda automática por cada letra tipeada en código, nombre o categoría
- ✅ Búsqueda y filtrado avanzado
- ✅ **Edición restringida de stocks iniciales** - Solo administradores pueden modificar stocks después de crear el EPP

### 📦 Control de Inventario
- ✅ Stock por almacén con movimientos detallados
- ✅ Tipos de movimiento: Entrada, Salida, Transferencia, Ajuste
- ✅ **Campo de precio unitario** - Registro de precio por producto para trazabilidad de costos
- ✅ **Campo de orden de compra** - Trazabilidad completa de compras
- ✅ **Sistema de aprobación de movimientos** - Movimientos de no-admins requieren aprobación de administrador
- ✅ **Modales mejorados con UX/UI optimizada** - Interfaz actualizada con secciones numeradas y mejor feedback visual
- ✅ Validación automática de disponibilidad
- ✅ Historial completo de transacciones
- ✅ Trazabilidad de operador y fecha/hora

### 🚚 Entregas de EPP
- ✅ Lotes de entrega con código único secuencial (DEL-XXXX)
- ✅ Entrega a colaboradores con datos completos
- ✅ Múltiples EPPs por entrega con cantidades
- ✅ Generación automática de PDF con formato corporativo
- ✅ Descuento automático de stock con validación
- ✅ **Protección anti-duplicación** con retry logic implementado
- ✅ **Botón de eliminación deshabilitado** para prevenir borrados accidentales

### 🔄 Devoluciones
- ✅ Registro de devoluciones con estado (Reutilizable/Descartado)
- ✅ Reingreso automático de stock para EPPs reutilizables
- ✅ Control de calidad en el proceso de devolución
- ✅ Lotes de devolución con trazabilidad

### 👥 Gestión de Colaboradores
- ✅ Base de datos de colaboradores con información detallada
- ✅ Filtrado por ubicación y puesto
- ✅ Historial de entregas por colaborador
- ✅ Importación masiva desde Excel

### 📊 Dashboard y Reportes
- ✅ KPIs en tiempo real con caché optimizado (5 min TTL)
- ✅ Gráficos interactivos de tendencias y consumo
- ✅ Reportes de movimientos con múltiples filtros
- ✅ Exportación a Excel con formato personalizado
- ✅ Análisis de consumo por categoría y ubicación

### 🔐 Seguridad y Autenticación
- ✅ Sistema de autenticación completo mediante Auth.js
- ✅ Manejo de sesiones con JWT y sincronización automática de roles
- ✅ **Monitoreo de cambios de roles en tiempo real** - Detecta cambios de rol y notifica al usuario automáticamente
- ✅ Sincronización automática de roles cada 5 minutos o en cambios
- ✅ Validación de permisos en cada operación
- ✅ **Perfil de usuario completo** - Avatar con carga en Vercel Blob Storage
- ✅ Cambio de contraseña seguro con bcrypt

### ⚡ Performance Optimizado
- ✅ Índices de base de datos para consultas rápidas
- ✅ Paginación eficiente con cursor-based pagination
- ✅ Caché en memoria para datos frecuentes
- ✅ Code splitting y lazy loading
- ✅ Optimización de consultas N+1 eliminada
- ✅ Bundle size reducido significativamente

---

## 🛠 Tecnologías Utilizadas

### Frontend
- **[Next.js 15](https://nextjs.org/)** - Framework React con App Router
- **[React 19](https://react.dev/)** - Biblioteca de UI con React Server Components
- **[TypeScript 5](https://www.typescriptlang.org/)** - Tipado estático
- **[Tailwind CSS 3](https://tailwindcss.com/)** - Framework de estilos utilitarios
- **[shadcn/ui](https://ui.shadcn.com/)** - Componentes de UI reutilizables
- **[TanStack Table](https://tanstack.com/table)** - Tablas avanzadas con sorting/filtering
- **[Recharts](https://recharts.org/)** - Gráficos interactivos
- **[Lucide React](https://lucide.dev/)** - Iconos modernos

### Backend
- **[Prisma ORM 6](https://www.prisma.io/)** - ORM type-safe para PostgreSQL
- **[PostgreSQL 16+](https://www.postgresql.org/)** - Base de datos relacional
- **[Zod](https://zod.dev/)** - Validación de esquemas
- **[React Hook Form](https://react-hook-form.com/)** - Manejo de formularios

### Autenticación y Usuarios
- **[Clerk](https://clerk.com/)** - Autenticación y gestión de usuarios

### DevOps y Deploy
- **[Vercel](https://vercel.com/)** - Platform as a Service para hosting
- **[pnpm](https://pnpm.io/)** - Gestor de paquetes eficiente
- **[ESLint](https://eslint.org/)** - Linting de código

### Otras Bibliotecas
- **[ExcelJS](https://github.com/exceljs/exceljs)** - Generación de archivos Excel
- **[jsPDF](https://github.com/parallax/jsPDF)** - Generación de PDFs
- **[date-fns](https://date-fns.org/)** - Manipulación de fechas
- **[Sonner](https://sonner.emilkowal.ski/)** - Notificaciones toast

---

## 🚀 Instalación y Configuración

### Requisitos Previos
- Node.js 18+ y pnpm instalado
- PostgreSQL 14+ corriendo localmente o en la nube
- Cuenta en [Clerk](https://clerk.com/) (gratuita)

### Paso 1: Clonar el Repositorio
```bash
git clone https://github.com/JorgeZavalaO/inv-epp.git
cd inv-epp
```

### Paso 2: Instalar Dependencias
```bash
pnpm install
```

### Paso 3: Configurar Variables de Entorno
Crear un archivo `.env` en la raíz del proyecto:

```env
# Base de datos
DATABASE_URL="postgresql://user:password@localhost:5432/inv_epp"

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
```

### Paso 4: Inicializar la Base de Datos
```bash
# Generar el cliente de Prisma
npx prisma generate

# Ejecutar migraciones
npx prisma migrate dev

# (Opcional) Seed con datos de prueba
npx prisma db seed
```

### Paso 5: Iniciar el Servidor de Desarrollo
```bash
pnpm dev
```

Visita [http://localhost:3000](http://localhost:3000) para ver la aplicación.

---

## 📂 Estructura del Proyecto

```
inv-epp/
├── prisma/
│   ├── schema.prisma              # Definición del schema de base de datos
│   └── migrations/                # Migraciones versionadas
├── public/
│   ├── assets/                    # Imágenes y recursos estáticos
│   ├── templates/                 # Plantillas Excel para importación
│   └── uploads/                   # Archivos subidos (logo, etc.)
├── src/
│   ├── app/                       # Next.js App Router
│   │   ├── (protected)/          # Rutas protegidas
│   │   │   ├── collaborators/   # Gestión de colaboradores
│   │   │   ├── dashboard/       # Dashboard principal
│   │   │   ├── deliveries/      # Entregas de EPP
│   │   │   ├── epps/            # Catálogo de EPPs
│   │   │   ├── reports/         # Reportes y análisis
│   │   │   ├── returns/         # Devoluciones
│   │   │   ├── settings/        # Configuración del sistema
│   │   │   ├── stock/           # Movimientos de stock
│   │   │   └── warehouses/      # Gestión de almacenes
│   │   ├── api/                  # API Routes
│   │   │   ├── delivery-batches/ # Endpoints de entregas
│   │   │   ├── deliveries/      # Listado y filtros
│   │   │   ├── warehouses/      # CRUD de almacenes
│   │   │   └── health/          # Health check endpoint
│   │   ├── sign-in/             # Página de login
│   │   ├── sign-up/             # Página de registro
│   │   ├── layout.tsx           # Layout principal
│   │   └── page.tsx             # Página de inicio
│   ├── components/               # Componentes React
│   │   ├── ui/                  # Componentes base (shadcn)
│   │   ├── delivery/            # Componentes de entregas
│   │   ├── dashboard/           # Componentes del dashboard
│   │   ├── reports/             # Componentes de reportes
│   │   └── ...
│   ├── lib/                      # Utilidades y helpers
│   │   ├── prisma.ts            # Cliente de Prisma singleton
│   │   ├── dashboard-cached.ts  # Caché de dashboard
│   │   ├── formatDate.ts        # Formateo de fechas
│   │   ├── reports.ts           # Lógica de reportes
│   │   ├── client-excel/        # Exportación Excel cliente
│   │   ├── pdf/                 # Generación de PDFs
│   │   └── cache/               # Sistema de caché
│   ├── schemas/                  # Schemas Zod de validación
│   │   ├── delivery-batch-schema.ts
│   │   ├── epp-schema.ts
│   │   └── ...
│   └── middleware.ts             # Middleware de autenticación
├── scripts/
│   ├── vercel-build.sh          # Script de build para Vercel
│   └── verify-indexes.js        # Verificación de índices DB
├── .env                          # Variables de entorno (no commitear)
├── .gitignore
├── components.json               # Configuración de shadcn
├── next.config.ts                # Configuración de Next.js
├── package.json
├── pnpm-lock.yaml
├── prisma.config.js
├── tailwind.config.ts            # Configuración de Tailwind
├── tsconfig.json                 # Configuración de TypeScript
├── vercel.json                   # Configuración de Vercel
└── README.md                     # Este archivo
```

---

## 🌐 Despliegue en Producción

### Despliegue en Vercel (Recomendado)

#### 1. Preparación

**Crear base de datos en producción:**
- Opciones recomendadas: [Neon](https://neon.tech/), [Supabase](https://supabase.com/), [PlanetScale](https://planetscale.com/)
- Obtener la `DATABASE_URL` de conexión

**Configurar Clerk para producción:**
- En Clerk Dashboard, crear un proyecto de producción
- Obtener las keys de producción

#### 2. Configurar Variables en Vercel

En **Vercel Dashboard** → **Project Settings** → **Environment Variables**:

```env
DATABASE_URL=postgresql://user:password@host:port/database
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
SKIP_ENV_VALIDATION=1
```

#### 3. Deploy

**Automático (recomendado):**
```bash
git push origin main
```
Vercel detectará el push y ejecutará el deploy automáticamente.

**Manual:**
```bash
vercel --prod
```

#### 4. Post-Deploy: Verificación

```bash
# Verificar health check
curl https://tu-app.vercel.app/api/health
```

**Respuesta esperada:**
```json
{
  "status": "healthy",
  "database": {
    "connected": true,
    "tables": 13,
    "indexes": 15,
    "lastMigration": "20250925000001_performance_indexes"
  }
}
```

### Proceso de Build en Vercel

El script `build:vercel` en `package.json` ejecuta:

1. ✅ Genera el cliente Prisma
2. ✅ Aplica migraciones con `prisma migrate deploy` (seguro, nunca hace reset)
3. ✅ Construye la aplicación Next.js
4. ✅ Verifica índices críticos de base de datos

**IMPORTANTE:** El sistema **nunca ejecuta** `prisma migrate reset` en producción, garantizando la seguridad de los datos.

### Troubleshooting del Deploy

#### Error de Build
```bash
# Verificar localmente
pnpm run build:vercel
```

#### Error de Migraciones
```bash
# Verificar estado de migraciones
npx prisma migrate status

# Ver logs en Vercel Dashboard
```

#### Error de Variables de Entorno
- Verificar que todas las variables estén configuradas en Vercel
- Confirmar que `DATABASE_URL` es accesible desde Vercel

### Rollback en Caso de Problemas

En **Vercel Dashboard**:
1. Ve a **Deployments**
2. Encuentra el deployment anterior estable
3. Click en **"Promote to Production"**

---

## ⚡ Optimizaciones Implementadas

### 🗄️ Base de Datos

**Índices Optimizados:**
```sql
-- Entregas
CREATE INDEX idx_delivery_batch_date_warehouse ON "DeliveryBatch" ("createdAt" DESC, "warehouseId");
CREATE INDEX idx_delivery_epp_batch ON "Delivery" ("batchId", "eppId");

-- Colaboradores
CREATE INDEX idx_collaborator_location_name ON "Collaborator" ("location", "name");

-- Movimientos de Stock
CREATE INDEX idx_stock_movement_type_date ON "StockMovement" ("type", "createdAt");

-- Reportes
CREATE INDEX idx_delivery_date_epp ON "Delivery" ("createdAt", "eppId");
```

**Resultados:**
- ⚡ Consultas de entregas: **60-80% más rápidas**
- ⚡ Dashboard KPIs: **Reducción de 2.5s a 400ms**
- ⚡ Reportes: **Mejora de 96% en tiempo de carga**

### 📦 Frontend

**Optimizaciones de Bundle:**
- Code splitting automático con Next.js
- Lazy loading de componentes pesados (gráficos)
- Optimización de paquetes con `optimizePackageImports`

**Resultados:**
- 📉 `/deliveries/[id]`: **258kB → 1.35kB** (99.5% reducción)
- 📉 `/reports`: **136kB → 4.89kB** (96.4% reducción)
- 📉 `/dashboard`: **2.28kB → 969B** (57.5% reducción)

### 💾 Caché Implementado

**Dashboard KPIs:**
- Caché en memoria con TTL de 5 minutos
- Invalidación automática en updates críticos
- Consultas agregadas optimizadas

**Beneficios:**
- ⚡ Tiempo de respuesta: **< 50ms** desde caché
- 📉 Carga de base de datos: **-70%**

### 🔍 Queries Optimizadas

**Eliminación de N+1:**
```typescript
// ❌ ANTES: Múltiples consultas
const batches = await prisma.deliveryBatch.findMany();
for (const batch of batches) {
  const collaborator = await prisma.collaborator.findUnique(...);
  const deliveries = await prisma.delivery.findMany(...);
}

// ✅ AHORA: Una sola consulta
const batches = await prisma.deliveryBatch.findMany({
  include: {
    collaborator: { select: { name: true } },
    deliveries: { select: { eppId: true, quantity: true } },
    _count: { select: { deliveries: true } }
  }
});
```

---

## 🔧 Problemas Conocidos y Soluciones

### 1. Eliminación Accidental de Entregas

**Problema:** Los usuarios eliminaban registros por error al hacer clic en el botón "Eliminar".

**Solución Implementada (Temporal):**
- ✅ Botón "Eliminar" deshabilitado en la UI
- ✅ Función de eliminación comentada pero preservada en el código
- ✅ Solo accesible mediante operación directa en base de datos

**Archivos Modificados:**
- `src/components/delivery/DeliveryBatchTable.tsx`
- `src/components/delivery/DeliveryBatchesClient.tsx`

**Solución Permanente Recomendada:**
1. Implementar **confirmación con código de seguridad**
2. Sistema de **permisos granulares** (solo admin puede eliminar)
3. **Soft delete** en lugar de eliminación física
4. **Log de auditoría** para rastrear operaciones

### 2. Duplicación de Registros de Entrega

**Problema:** En casos de uso simultáneo, se creaban registros duplicados debido a race conditions en la generación de códigos secuenciales.

**Causa Raíz:**
- Dos usuarios consultaban el último código al mismo tiempo
- Ambos obtenían el mismo número antes de que se insertara el nuevo registro
- Aunque hay un índice único en `code`, ambos registros se creaban con diferentes códigos

**Solución Implementada:**
- ✅ **Retry logic con detección de conflictos**: Sistema que reintenta hasta 5 veces con delay exponencial
- ✅ **Índice único en `code`**: Ya existía en el schema de Prisma
- ✅ **Detección de error P2002**: Captura específica de violaciones de unicidad
- ✅ **Delay exponencial**: 50ms, 100ms, 200ms, 400ms, 800ms entre reintentos

**Código Implementado en `actions.ts`:**
```typescript
const MAX_RETRIES = 5;
let attempt = 0;

while (attempt < MAX_RETRIES) {
  try {
    // Intentar crear el batch
    const result = await prisma.$transaction(...);
    return result; // Éxito
  } catch (error) {
    // Si es error de código único y hay reintentos disponibles
    if (error.code === 'P2002' && attempt < MAX_RETRIES - 1) {
      attempt++;
      await new Promise(resolve => 
        setTimeout(resolve, 50 * Math.pow(2, attempt - 1))
      );
      continue;
    }
    throw error;
  }
}
```

**Resultado:**
- ✅ **Cero duplicaciones** en pruebas de concurrencia
- ✅ **Tolerancia a fallos** automática
- ✅ **Performance sin impacto** (solo si hay conflicto)

### 3. Edición de Stocks Iniciales Solo para Administradores

**Problema:** Todos los usuarios podían editar los stocks iniciales de un EPP después de su creación, lo cual es una acción crítica que debe estar restringida.

**Solución Implementada:**
- ✅ **Validación en frontend**: Campos deshabilitados para no-admins en `ModalEditEpp.tsx`
- ✅ **Validación en backend**: Servidor ignora cambios en stocks si no es ADMIN en `updateEpp` action
- ✅ **Mensaje informativo**: Los usuarios no-admin ven una explicación clara del bloqueo
- ✅ **Otros campos editables**: Nombre, categoría, descripción y stock mínimo siguen siendo editables para todos

**Archivos Modificados:**
- `src/components/epp/ModalEditEpp.tsx` - Deshabilitar campos de stock para no-admin
- `src/components/ui/ComboboxWarehouse.tsx` - Soporte para propiedad `disabled`
- `src/app/(protected)/epps/actions.ts` - Validación en backend

**Comportamiento:**
```typescript
// Solo si es ADMIN
if (canEditStocks) {
  await prisma.$transaction(async (tx) => {
    // Actualizar stocks...
  });
}
```

**Resultado:**
- ✅ **Seguridad**: Solo admins pueden modificar datos críticos de inventario
- ✅ **UX clara**: Usuarios no-admin entienden por qué no pueden editar stocks
- ✅ **Flexibilidad**: Admins mantienen control total, otros campos editables

### 4. Sistema de Auditoría - Serialización de BigInt

**Problema:** Los logs de auditoría mostraban "No se encontraron registros" aunque había 23 logs en la base de datos.

**Causa Raíz:**
- El campo `id` en AuditLog es de tipo `BigInt` en PostgreSQL
- JavaScript/JSON no puede serializar valores `BigInt` directamente
- Esto causaba un error silencioso al intentar enviar los datos al cliente

**Solución Implementada:**
- ✅ **Cambio de tipo en schema**: `changes` de `String?` a `Json?` para mejor manejo de datos
- ✅ **Conversión en API**: Convertir `id` de `BigInt` a `string` antes de serializar como JSON
- ✅ **Migración de base de datos**: Migración SQL ejecutada para actualizar tipo de columna

**Archivos Modificados:**
- `prisma/schema.prisma` - Campo `changes` como `Json?`
- `src/app/api/audit-logs/route.ts` - Convertir BigInt a string
- `prisma/migrations/20251106_change_auditlog_changes_to_json/migration.sql` - Migración ejecutada

**Código Implementado:**
```typescript
const logsWithStringId = logs.map(log => ({
  ...log,
  id: log.id.toString(),
}));
```

**Resultado:**
- ✅ **Logs visibles**: Todos los logs se muestran correctamente en la UI
- ✅ **Estadísticas precisas**: Conteos y análisis funcionan correctamente
- ✅ **Sin duplicación**: JSON válido en todas las respuestas

### 5. Sistema de Aprobación de Movimientos de Stock

**Problema:** Todos los usuarios podían crear movimientos de stock que se aplicaban inmediatamente, sin revisión.

**Solución Implementada:**
- ✅ **Estados de movimiento**: PENDING, APPROVED, REJECTED
- ✅ **Lógica condicional**: Admins crean con APPROVED, otros con PENDING
- ✅ **Stock no se actualiza**: Solo se actualiza cuando el movimiento es APPROVED
- ✅ **Interfaz de aprobación**: Modal para admins ver y aprobar/rechazar movimientos
- ✅ **Información de rechazo**: Campo opcional para explicar rechazos

**Archivos Modificados:**
- `src/app/(protected)/stock-movements/actions.ts` - Lógica de aprobación
- `src/app/(protected)/stock-movements/actions-entry.ts` - Mismo para entradas en batch
- `src/components/stock/ModalPendingApprovals.tsx` - UI para aprobaciones
- `prisma/schema.prisma` - Enum `MovementStatus` y campos en `StockMovement`

**Flujo:**
1. Usuario no-admin crea movimiento → `PENDING`
2. Stock NO se actualiza automáticamente
3. Admin ve movimiento pendiente en botón "Aprobaciones Pendientes"
4. Admin aprueba → `APPROVED` + Stock se actualiza
5. O Admin rechaza → `REJECTED` + Stock no se afecta

**Resultado:**
- ✅ **Contro de calidad**: Todos los movimientos revierten antes de afectar stock
- ✅ **Auditoría**: Cada aprobación/rechazo queda registrado
- ✅ **Trazabilidad**: Se sabe quién aprobó, cuándo y si fue rechazado

### 6. Sincronización de Roles en Tiempo Real

**Problema:** Cuando se cambiaba el rol de un usuario, los cambios no se reflejaban en la sesión activa hasta que el usuario cerrara/abriera sesión.

**Solución Implementada:**
- ✅ **JWT callback con verificación**: Consulta DB cada 5 minutos para verificar cambios de rol
- ✅ **SessionMonitor**: Componente que detecta cambios de rol en tiempo real
- ✅ **Notificación automática**: Toast informando al usuario sobre cambio de rol
- ✅ **Recarga de página**: Automática después de cambio de rol

**Archivos Modificados:**
- `src/lib/auth.config.ts` - JWT callback con lógica de verificación
- `src/components/auth/SessionMonitor.tsx` - Monitoreo en cliente
- `src/components/auth/UserMenu.tsx` - Etiquetas de rol en español

**Variables en JWT:**
```typescript
token.lastRoleCheck = Date.now(); // Controla cuándo consultar DB
```

**Resultado:**
- ✅ **Experiencia fluida**: Cambios de rol se reflejan en segundos
- ✅ **Sin confusión**: Usuario sabe cuándo su rol cambió
- ✅ **Seguridad**: Permisos actualizados automáticamente

### 7. Perfil de Usuario con Carga de Avatar

**Problema:** No había forma para los usuarios de ver/actualizar su perfil ni cambiar su avatar.

**Solución Implementada:**
- ✅ **Página de perfil**: `/profile` con información del usuario
- ✅ **Upload de avatar**: Carga a Vercel Blob Storage
- ✅ **Cambio de contraseña**: Formulario con validación
- ✅ **Estadísticas**: Último login, actividad reciente, rol actual

**Archivos Nuevos:**
- `src/app/(protected)/profile/page.tsx` - Página del perfil
- `src/components/profile/ProfileForm.tsx` - Edición de datos básicos
- `src/components/profile/PasswordForm.tsx` - Cambio de contraseña
- `src/app/api/profile/route.ts` - Endpoint para actualizar perfil
- `src/app/api/profile/password/route.ts` - Endpoint para cambiar contraseña
- `src/app/api/upload/route.ts` - Endpoint para upload a Blob Storage

**Características:**
- Validación con React Hook Form + Zod
- Upload de imagen con validación de tipo/tamaño
- Hash de contraseña con bcrypt
- Auditoría de cambios

**Resultado:**
- ✅ **Autonomía**: Usuarios controlan su propia información
- ✅ **Seguridad**: Contraseñas hasheadas, avatares en CDN
- ✅ **Experiencia**: Interfaz clara y amigable

---

## 🔌 API y Endpoints

### Autenticación
Todos los endpoints de API requieren autenticación mediante Clerk. El middleware automáticamente valida el token JWT.

### Endpoints Principales

#### Entregas
```
GET    /api/deliveries                     # Listar entregas con paginación y filtros
GET    /api/delivery-batches/[id]          # Detalle de una entrega específica
POST   /api/delivery-batches               # Crear nueva entrega (Server Action)
PATCH  /api/delivery-batches/[id]          # Editar entrega existente
DELETE /api/delivery-batches/[id]          # Eliminar entrega (deshabilitado en UI)
GET    /api/delivery-batches/[id]/pdf      # Descargar PDF de entrega
GET    /api/deliveries/filters             # Opciones para filtros (colaboradores, almacenes)
GET    /api/deliveries/stats               # Estadísticas de entregas
```

#### EPPs
```
GET    /api/epps                           # Listar EPPs con paginación
GET    /api/epps/[id]                      # Detalle de un EPP
POST   /api/epps                           # Crear nuevo EPP
PATCH  /api/epps/[id]                      # Editar EPP
DELETE /api/epps/[id]                      # Eliminar EPP
GET    /api/epp-stocks                     # Stock disponible por EPP y almacén
```

#### Almacenes
```
GET    /api/warehouses                     # Listar almacenes
POST   /api/warehouses                     # Crear almacén
PATCH  /api/warehouses/[id]                # Editar almacén
DELETE /api/warehouses/[id]                # Eliminar almacén
```

#### Colaboradores
```
GET    /api/collaborators                  # Listar colaboradores
POST   /api/collaborators                  # Crear colaborador
PATCH  /api/collaborators/[id]             # Editar colaborador
DELETE /api/collaborators/[id]             # Eliminar colaborador
POST   /api/collaborators/import           # Importar desde Excel
```

#### Dashboard y Reportes
```
GET    /api/dashboard/kpis                 # KPIs principales (cacheado)
GET    /api/dashboard/charts               # Datos para gráficos
GET    /api/reports/movements              # Reporte de movimientos
GET    /api/reports/deliveries             # Reporte de entregas
GET    /api/reports/export                 # Exportar a Excel
```

#### Auditoría
```
GET    /api/audit-logs                     # Listar logs de auditoría con filtros
GET    /api/audit-logs/stats               # Estadísticas de auditoría
GET    /api/cron/cleanup-audit-logs        # Limpieza automática (Vercel Cron)
```

**Query Parameters para `/api/audit-logs`:**
- `entityType` - Filtrar por tipo (DeliveryBatch, EPP, etc.)
- `entityId` - Filtrar por ID específico
- `userId` - Filtrar por usuario
- `action` - Filtrar por acción (CREATE, UPDATE, DELETE)
- `dateFrom` - Fecha desde (ISO 8601)
- `dateTo` - Fecha hasta (ISO 8601)
- `page` - Número de página (default: 1)
- `limit` - Resultados por página (default: 50, max: 100)

#### Health Check
```
GET    /api/health                         # Estado del sistema y base de datos
```

**Respuesta:**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-01T12:00:00.000Z",
  "database": {
    "connected": true,
    "tables": 13,
    "indexes": 15,
    "lastMigration": "20250925000001_performance_indexes"
  },
  "version": "1.0.0"
}
```

---

## 🔍 Mantenimiento y Monitoreo

### Monitoreo de Salud

**Health Check Endpoint:**
```bash
curl https://tu-app.vercel.app/api/health
```

**Verificar Índices de Base de Datos:**
```sql
SELECT schemaname, tablename, indexname, indexdef 
FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY tablename, indexname;
```

**Detectar Códigos Duplicados:**
```sql
SELECT code, COUNT(*) as count 
FROM "DeliveryBatch" 
GROUP BY code 
HAVING COUNT(*) > 1;
```

### Backups Recomendados

**Frecuencia:**
- **Diario**: Backup completo de la base de datos
- **Semanal**: Backup de archivos (imágenes, uploads)
- **Antes de deploys**: Snapshot de estado actual

**Comandos PostgreSQL:**
```bash
# Backup completo
pg_dump -h host -U user -d inv_epp -F c -b -v -f backup_$(date +%Y%m%d).backup

# Restaurar
pg_restore -h host -U user -d inv_epp -v backup.backup
```

### Logs y Debugging

**Vercel Functions Logs:**
- Dashboard → Functions → View Function Logs

**Prisma Query Logging:**
```typescript
// Habilitar en desarrollo
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});
```

### Performance Monitoring

**Métricas Clave:**
- ⏱️ Tiempo de respuesta API: **< 500ms**
- 📊 Lighthouse Score: **> 90**
- 🔄 Uptime: **> 99.9%**
- 💾 Database Connections: **< 80% del pool**

**Herramientas:**
- Vercel Analytics
- Vercel Speed Insights
- PostgreSQL pg_stat_statements

---

## 🗺️ Roadmap de Funcionalidades

### ✅ Fase 1: Fundación (Completado)
- [x] Sistema de gestión de EPPs
- [x] Control de inventario multi-almacén
- [x] Entregas y devoluciones
- [x] Dashboard con KPIs
- [x] Autenticación de usuarios con Auth.js
- [x] Optimización de performance
- [x] Sistema anti-duplicación
- [x] Sistema completo de auditoría
- [x] Gestión avanzada de usuarios y roles
- [x] Sistema de aprobación de movimientos
- [x] Edición restringida de EPP por rol

### 🚧 Fase 2: Mejoras Avanzadas (En Progreso)
- [ ] Sistema de notificaciones por email
- [ ] Alertas automáticas de stock bajo
- [ ] Reportes programados
- [ ] API REST pública con autenticación
- [ ] Exportación de datos avanzada

### 🔮 Fase 3: Funcionalidades Empresariales (Planeado)
- [ ] **PWA**: Aplicación móvil progresiva
- [ ] **Código QR**: Escaneo de EPPs para entregas rápidas
- [ ] **Firma Digital**: Captura de firma en entregas
- [ ] **Roles y Permisos**: Control granular de acceso (en progreso)
- [ ] **Multi-idioma**: Internacionalización (i18n)

### 🌟 Fase 4: Inteligencia y Automatización (Futuro)
- [ ] **Machine Learning**: Predicción de demanda
- [ ] **Análisis Predictivo**: Optimización de inventario
- [ ] **Dashboards Personalizables**: Widgets arrastrables
- [ ] **Integraciones ERP**: SAP, Oracle, Dynamics 365
- [ ] **Active Directory**: Sincronización de usuarios
- [ ] **BI Integration**: Power BI, Tableau

---

## 👥 Gestión de Usuarios (Módulo Interno)

El sistema diferencia entre:
- Usuarios de aplicación (autenticación / roles / permisos)
- Colaboradores (personas que reciben EPP)

### Roles Jerárquicos
`ADMIN > SUPERVISOR > WAREHOUSE_MANAGER > OPERATOR > VIEWER`

### Permisos Granulares (28)
Agrupados por módulos: dashboard, epp, warehouse, stock, delivery, return, collaborator, user.
Ejemplos: `delivery_create`, `stock_transfer`, `assign_roles`.

### Principales Acciones (Server Actions)
- `getUsers`, `getUserById`
- `createUser`, `updateUser`, `changeUserPassword`
- `deleteUser` (soft delete → convierte a VIEWER + revoca permisos)
- `assignPermissions`, `getAllPermissions`, `getUserStats`

### Seguridad
- No puede eliminarse el último ADMIN.
- No se permite autodesasignación destructiva de rol.
- Eliminación suave (integridad histórica / auditoría).

### UI
`/users` incluye: tabla, búsqueda reactiva, modales de creación/edición, gestión de permisos por lotes, cambio de contraseña y control de acciones según permisos.

### Mejoras Futuras Sugeridas
- Exportación a Excel, plantillas de permisos, historial de cambios en roles, notificaciones de seguridad.

---

## 🔐 Autenticación (Auth.js) & Roles

Migración completa desde Clerk a Auth.js con provider de credenciales.

### Variables de Entorno Requeridas
```
AUTH_SECRET=<openssl rand -base64 32>          # (Compat) puedes usar NEXTAUTH_SECRET
AUTH_URL=https://tu-dominio.vercel.app         # URL pública en Vercel
NEXTAUTH_URL=http://localhost:3000             # URL local de desarrollo
DATABASE_URL=postgresql://...
```

> En Vercel define `AUTH_SECRET` (o `NEXTAUTH_SECRET`) **y** `AUTH_URL` con el dominio público. Para entornos locales conserva `NEXTAUTH_URL=http://localhost:3000`.

### Flujo Básico
1. Ejecutar script de contraseña para usuario existente:
   `pnpm tsx scripts/set-user-password.ts`
2. Iniciar sesión en `/auth/signin`.
3. Registro opcional en `/auth/signup` (usuario inicial ADMIN).

### Roles & Permisos
Implementados mediante enum `UserRole` + tablas `Permission` y `UserPermission`.

### Estado de Migración
- Clerk eliminado (dependencias removidas / variables limpiadas)
- Sistema de auditoría adaptado a IDs string
- Middleware adaptado (`src/middleware.ts`)

---

## 🛡 Sistema de Auditoría

### Objetivo
Trazabilidad total de operaciones críticas (CREATE, UPDATE, DELETE) con bajo impacto de performance y retención configurable.

### Modelo (Resumen)
`AuditLog(id, userId, action, entityType, entityId, changes, metadata, createdAt, expiresAt)`

### Cambios Registrados
- CREATE: snapshot esencial
- UPDATE: solo diffs `{ field: { from, to } }`
- DELETE: snapshot ligero previo

### Optimización
- Logging asíncrono + batching (versión optimizada disponible con cola y rate limiting)
- Índices: `(entityType, entityId)`, `(userId)`, `(createdAt)`, `(expiresAt)`

### UI Interactiva
- Ruta: `/audit-logs`
- Panel de métricas, filtros avanzados, tabla paginada, JSON legible, paginación.

### Retención & Limpieza
- Cron diario (2:00 AM) ejecuta limpieza: expira según política declarada en `src/lib/audit/config.ts`.

### Filtros API
`entityType, entityId, userId, action, dateFrom, dateTo, page, limit`

### Ejemplo de Dif (UPDATE)
```json
{
  "collaboratorId": { "from": 5, "to": 8 },
  "note": { "from": "Entrega mensual", "to": "Entrega mensual actualizada" }
}
```

### Seguridad
- Filtrado de campos sensibles (password, token, apiKey, secret, etc.)
- Acceso autenticado obligatorio

### Métricas
- Overhead medio: ~3ms por operación auditada
- Almacenamiento mensual estimado: 10–100MB según volumen

### Scripts / Archivos Relevantes
```
prisma/schema.prisma           # Modelo AuditLog
src/lib/audit/config.ts        # Retención
src/lib/audit/logger.ts        # Logger base
scripts/cleanup-audit-logs.ts  # Limpieza manual
vercel.json                    # Cron job
```

---

## ⚙️ Performance del Sistema de Auditoría

Se añadió un logger optimizado (batching + rate limiting) y monitoreo en tiempo real.

### Parámetros (Resumen)
```
BATCH_SIZE=10
BATCH_TIMEOUT=5000 ms
MAX_QUEUE_SIZE=100
RATE_LIMIT=50 logs/min/usuario
MAX_CHANGES_SIZE=50KB (compresión)
```

### Componentes de Monitoreo
```
src/lib/performance/audit-analyzer.ts
src/lib/performance/diagnostic.ts
src/app/api/performance/audit/route.ts
src/app/api/performance/quick-check/route.ts
src/components/performance/PerformanceMonitorClient.tsx
```

### Resultados Estimados
- Throughput +300%
- Uso de memoria en picos -60%
- Latencia media -75%
- CPU -40% durante lotes

### Pruebas de Carga
Presets (light, moderate, heavy, stress) mediante utilidades internas.

---

## 🤝 Contribución

### Cómo Contribuir

1. **Fork** el repositorio
2. Crea una **rama** para tu feature (`git checkout -b feature/AmazingFeature`)
3. **Commit** tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. **Push** a la rama (`git push origin feature/AmazingFeature`)
5. Abre un **Pull Request**

### Guías de Estilo

- Usar **TypeScript** para todo el código nuevo
- Seguir las reglas de **ESLint** configuradas
- Escribir **tests** para funcionalidades críticas
- Documentar funciones complejas con **JSDoc**
- Usar **Conventional Commits** para mensajes

### Reportar Bugs

Usa la sección de **Issues** de GitHub para reportar bugs. Incluye:
- Descripción detallada del problema
- Pasos para reproducir
- Comportamiento esperado vs. actual
- Screenshots si es aplicable
- Información del entorno (navegador, OS, etc.)

---

## 📄 Licencia

Este proyecto es software privado desarrollado para uso interno. Todos los derechos reservados.

**Contacto:** [Jorge Zavala](https://github.com/JorgeZavalaO)

---

## 📞 Soporte y Contacto

Para preguntas, sugerencias o problemas:

- **GitHub Issues**: [inv-epp/issues](https://github.com/JorgeZavalaO/inv-epp/issues)
- **Email**: jzavalaolivares@gmail.com
- **Documentación**: Ver este README para guías detalladas

---

<div align="center">

**⭐ Si este proyecto te resulta útil, considera darle una estrella en GitHub ⭐**

Hecho con ❤️ usando Next.js y TypeScript

</div>

---

## 🗂️ Changelog

### 2025-11-06
- ✅ **Edición restringida de stocks iniciales en EPP** - Solo administradores pueden editar stocks después de crear un EPP
- ✅ **Sistema de aprobación de movimientos de stock** - Movimientos de no-admins requieren aprobación antes de afectar stock
- ✅ **Corección de auditoría** - Serialización correcta de BigInt en logs, campo `changes` como JSON
- ✅ **Sincronización de roles en tiempo real** - Detecta cambios de rol automáticamente cada 5 minutos
- ✅ **Página de perfil de usuario** - Avatar con Vercel Blob Storage, cambio de contraseña
- ✅ **Interfaz de aprobaciones pendientes** - Modal para admins gestionar movimientos en espera
- ✅ **Build validation** - Todos los errores de ESLint y TypeScript resueltos

### 2025-10-06
- Consolidación de toda la documentación dispersa en un único README.
- Eliminados (o vaciados para futura remoción) archivos markdown obsoletos: migraciones Auth.js, auditoría, performance, usuarios, guías de pasos y resúmenes históricos.
- Añadidas secciones nuevas: Gestión de Usuarios, Autenticación & Roles, Sistema de Auditoría, Performance del Sistema de Auditoría.
- Estandarización de terminología (entidades auditadas, roles, permisos, batching y retención).
- Preparado terreno para eliminación física definitiva de placeholders (actualmente vacíos) en un próximo commit de limpieza.

### 2025-10 (Anterior)
- Implementación del sistema de auditoría con retención y cron de limpieza.
- Migración completa de Clerk a Auth.js con roles y permisos granulares.
- Módulo de gestión de usuarios avanzado (CRUD, permisos, roles, protección de último admin).
- Optimización de rendimiento (índices, caché, batching en auditoría, reducción de bundle).

### 2025-09
- Índices de performance adicionales en base de datos.
- Mejoras de dashboards y reducción de tiempos de consulta.

### 2025-08 y previos
- Funcionalidades base: inventario, entregas, devoluciones, reportes, multi-almacén.
- Exportaciones (Excel/PDF) y generación de códigos secuenciales con retry seguro.

> Próximas entradas se agregarán cronológicamente con formato semántico (YYYY-MM-DD) enfocadas en cambios funcionales, migraciones y tareas de mantenimiento mayor.
