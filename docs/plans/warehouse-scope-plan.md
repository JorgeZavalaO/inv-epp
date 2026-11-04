# Plan de implementación: alcance de almacén por usuario

> Documento de trabajo para el agente que implementará la funcionalidad.
> Fecha: 2026-11-04 · Rama base: `master` · Gestor de paquetes: `pnpm@11.3.0`

---

## 0. ADVERTENCIA: LOS CAMBIOS VAN DIRECTO A PRODUCCIÓN

Los cambios se desplegarán **directamente a producción**. `scripts/vercel-build.sh` ejecuta
`prisma migrate deploy` automáticamente en el build de producción de Vercel; **cualquier
migración incluida en `master` se aplicará sobre la base de datos real con datos reales**.

### 0.1 Prohibiciones absolutas

- **NUNCA** ejecutar `prisma migrate reset`.
- **NUNCA** ejecutar `prisma db push` (con o sin `--force-reset` / `--accept-data-loss`).
- **NUNCA** ejecutar `prisma migrate dev` contra la base de producción. `migrate dev` puede
  detectar drift y **proponer o ejecutar un reset**.
- **NUNCA** usar la base de producción como `--shadow-database-url`: Prisma **resetea** la
  base shadow.
- **NUNCA** incluir en una migración `DROP TABLE`, `DROP COLUMN`, `TRUNCATE`, `DELETE`,
  renombrar columnas, ni `ALTER COLUMN ... SET NOT NULL` sobre columnas con datos existentes.
- **NUNCA** editar ni borrar migraciones ya aplicadas en `prisma/migrations/`. Tampoco tocar el
  archivo suelto `prisma/migrations/add_stock_movement_approval_system.sql`.
- **NUNCA** ejecutar `prisma migrate resolve` sin autorización explícita del usuario.
- **NUNCA** borrar ni resetear ramas de Neon, ni ejecutar herramientas destructivas de Neon.
- Si `prisma migrate status` reporta drift, migraciones fallidas o pendientes desconocidas:
  **DETENERSE e informar al usuario**. No intentar "arreglarlo".

### 0.2 Antes de ejecutar cualquier comando de Prisma

1. Revisar a qué base apuntan `DATABASE_URL` y `DIRECT_DATABASE_URL` en el `.env` local. Si
   apuntan a producción, **solo** se permiten comandos de lectura (`prisma migrate status`,
   `prisma generate`).
2. Para validar la migración, usar una **rama de Neon creada desde producción** (copia
   desechable) o una base local. Nunca producción.

### 0.3 Estrategia de migración: expand-only

La migración debe ser **aditiva y retrocompatible**:

- Solo columnas nuevas **nullable** o con `DEFAULT`, un enum nuevo, índices y claves foráneas.
- El código actualmente desplegado debe seguir funcionando con el esquema nuevo. Así, un
  rollback del código en Vercel es seguro **sin revertir la migración**.
- **Nunca** revertir la migración con `DROP`. Si hay un problema, se revierte el código y se
  corrige con una migración nueva hacia adelante.

---

## 1. Reglas de negocio (decididas con el usuario)

| # | Regla |
|---|-------|
| R1 | Cada usuario tiene **almacenes permitidos** (autorización) y un **almacén principal** (predeterminado). |
| R2 | Cada usuario elige su **vista**: `PRIMARY` (solo su almacén principal) o `ALL` (todos sus almacenes permitidos). |
| R3 | La preferencia de vista es **personal**: cambia solo para el usuario actual, nunca para los demás. Sin switch global (ver §13). |
| R4 | El filtro se aplica **en el servidor** a todo el sistema: lecturas, conteos, gráficos, exportaciones, detalles, selectores y escrituras. Ocultar en el cliente no alcanza. |
| R5 | La vista nunca amplía permisos: `ALL` significa "todos mis permitidos", no "todos los almacenes". |
| R6 | **Traslados**: el origen es **siempre el almacén principal** del usuario, no es editable y lo valida el servidor. El destino es seleccionable entre **cualquier otro almacén existente**, aunque no esté en la vista activa. |
| R7 | **EPP y colaboradores** son catálogos compartidos y no se filtran. Sí se filtran sus existencias, entregas, devoluciones e historial. |
| R8 | **Solicitudes** se filtran por almacén. Se agrega `Request.warehouseId`. |
| R9 | El almacén principal lo asigna un **ADMIN** en Usuarios. En Configuración, el usuario elige su vista; un ADMIN también puede cambiar su propio principal. |

### 1.1 Matriz de alcance

| Rol | Almacenes permitidos (`allowedIds`) |
|-----|------------------------------------|
| ADMIN, OPERATOR, VIEWER | `null` = todos los almacenes (comportamiento actual) |
| SUPERVISOR, WAREHOUSE_MANAGER | asignaciones de `UserWarehouse` (puede ser `[]`) |

| Vista | Almacén principal válido | Alcance efectivo (`effectiveIds`) |
|-------|--------------------------|-----------------------------------|
| `ALL` | indistinto | `allowedIds` |
| `PRIMARY` | sí (existe y está en permitidos) | `[primaryWarehouseId]` |
| `PRIMARY` | no | `allowedIds` + aviso en UI "Configura tu almacén principal" |

- `effectiveIds === null` significa sin filtro.
- `effectiveIds === []` significa **sin resultados**, no sin filtro.
- Un principal es **válido** solo si `allowedIds === null || allowedIds.includes(primary)`.

---

## 2. Estado actual (hallazgos verificados)

- `UserWarehouse` existe (`prisma/schema.prisma:148`), pero no hay almacén principal ni preferencia.
- `getAccessibleWarehouseIds` y `assertWarehouseAccess` (`src/lib/auth-utils.ts:243-273`) solo
  se usan en 5 puntos de escritura/detalle. **Ningún listado está filtrado.**
- `GET /api/warehouses` (`src/app/api/warehouses/route.ts:15`) **no tiene autenticación** y responde
  con `Cache-Control: public, max-age=300`. Lo usan 10 componentes como selector.
- El dashboard (`src/lib/dashboard.ts`) usa SQL crudo y agregados globales, cacheados con una
  sola clave compartida `dashboard:kpis` (`src/lib/dashboard-cached.ts`).
- El banner de stock crítico del layout (`src/lib/alerts.ts` → `getLowStockCount`) es global.
- `Request` no tiene `warehouseId`; `POST /api/requests` hace `create({ data })` con el body crudo
  (asignación masiva). `GET /api/requests` y `GET /api/approvals` no exigen autenticación.
- `GET /api/epp-stocks`, `/api/stock-movements/[id]`, `/api/requests/[id]` y `/api/approvals/[id]`
  no validan autenticación ni almacén.
- La página `/settings` exige `settings_update` (`page.tsx:10`) y `SidebarNav.tsx:35` la oculta sin ese permiso.
- La sesión es JWT y solo contiene `id` y `role`. **No** guardar el alcance en el JWT: leerlo de la base en cada request.
- No hay framework de tests en `package.json`. No agregar dependencias sin aprobación del usuario.

---

## 3. Fase 1 — Modelo de datos y migración

### 3.1 Cambios en `prisma/schema.prisma`

```prisma
enum WarehouseViewMode {
  PRIMARY
  ALL
}

model User {
  // ...campos existentes...
  primaryWarehouseId Int?
  warehouseViewMode  WarehouseViewMode @default(ALL)
  primaryWarehouse   Warehouse?        @relation("UserPrimaryWarehouse", fields: [primaryWarehouseId], references: [id], onDelete: SetNull, onUpdate: Cascade)

  @@index([primaryWarehouseId])
}

model Warehouse {
  // ...campos existentes...
  primaryForUsers User[]    @relation("UserPrimaryWarehouse")
  requests        Request[]
}

model Request {
  // ...campos existentes...
  warehouseId Int?
  warehouse   Warehouse? @relation(fields: [warehouseId], references: [id], onDelete: Restrict, onUpdate: Cascade)

  @@index([warehouseId, createdAt])
}
```

`Request.warehouseId` queda **nullable** por las solicitudes históricas. La obligatoriedad se
aplica en la aplicación. Volverla `NOT NULL` solo sería posible en una migración futura, después
del backfill aprobado.

### 3.2 Migración: `prisma/migrations/20261104000000_add_user_warehouse_scope/migration.sql`

Escribirla manualmente con este contenido:

```sql
-- CreateEnum
CREATE TYPE "WarehouseViewMode" AS ENUM ('PRIMARY', 'ALL');

-- AlterTable: User (nullable + default => metadata-only, sin reescritura)
ALTER TABLE "User"
    ADD COLUMN "primaryWarehouseId" INTEGER,
    ADD COLUMN "warehouseViewMode"  "WarehouseViewMode" NOT NULL DEFAULT 'ALL';

-- AlterTable: Request
ALTER TABLE "Request" ADD COLUMN "warehouseId" INTEGER;

-- CreateIndex
CREATE INDEX "User_primaryWarehouseId_idx" ON "User"("primaryWarehouseId");
CREATE INDEX "Request_warehouseId_createdAt_idx" ON "Request"("warehouseId", "createdAt");

-- AddForeignKey: User -> Warehouse
ALTER TABLE "User" ADD CONSTRAINT "User_primaryWarehouseId_fkey"
    FOREIGN KEY ("primaryWarehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: Request -> Warehouse
ALTER TABLE "Request" ADD CONSTRAINT "Request_warehouseId_fkey"
    FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Deterministic backfill: users with exactly one warehouse assignment
UPDATE "User" AS u
SET "primaryWarehouseId" = uw."warehouseId"
FROM (
    SELECT "userId", MIN("warehouseId") AS "warehouseId"
    FROM "UserWarehouse"
    GROUP BY "userId"
    HAVING COUNT(*) = 1
) AS uw
WHERE u."id" = uw."userId"
  AND u."primaryWarehouseId" IS NULL;
```

Notas:
- `DEFAULT 'ALL'` conserva la visión actual de todos los usuarios después del deploy.
- **No** hacer backfill de `Request.warehouseId` en la migración (ver §9.4).
- No se borra ni modifica ningún dato existente; solo se completan valores `NULL` de forma determinística.

### 3.3 Verificar la migración SIN tocar producción

1. Crear una base desechable: una rama de Neon desde producción o una base local.
2. Verificar que esquema y migración coincidan (**la shadow DB debe ser desechable, nunca producción**):
   ```powershell
   pnpm exec prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --shadow-database-url "<URL_DESECHABLE>" --script
   ```
   La salida debe estar **vacía**. Si no, ajustar el SQL o el esquema hasta que coincidan.
3. Aplicar en la rama copia de producción:
   ```powershell
   $env:DATABASE_URL="<URL_RAMA>"; $env:DIRECT_DATABASE_URL="<URL_RAMA>"; pnpm exec prisma migrate deploy
   ```
4. Verificar en la rama que se conserven los conteos: `SELECT COUNT(*)` de `User`, `Request`,
   `StockMovement`, `EPPStock`, `DeliveryBatch` y `ReturnBatch` deben ser iguales antes y después.
5. `pnpm exec prisma generate`.

---

## 4. Fase 2 — Núcleo: resolución centralizada del alcance

### 4.1 Nuevo módulo `src/lib/warehouse-scope.ts`

```ts
import { cache } from "react";
import { Prisma, WarehouseViewMode } from "@prisma/client";

export type WarehouseScope = {
  userId: string;
  allowedIds: number[] | null;        // null = all warehouses
  primaryWarehouseId: number | null;  // null when unset or no longer allowed
  viewMode: WarehouseViewMode;
  effectiveIds: number[] | null;      // null = no filter, [] = nothing
  cacheKey: string;                   // "all" | "w:1,3" (sorted)
};

// Resolve once per request (React cache). Throws "No autenticado" if no session.
export const getWarehouseScope = cache(async (): Promise<WarehouseScope> => { /* ... */ });

// Intersect an optional requested warehouse filter with the effective scope.
// Returns [] when the requested id is outside the scope (never widens).
export function narrowScope(scope: WarehouseScope, requestedId?: number): number[] | null;

// Prisma helper: undefined => no filter.
export function warehouseIdFilter(ids: number[] | null): Prisma.IntFilter | undefined;

// Raw SQL helper for $queryRaw.
export function sqlWarehouseIn(column: Prisma.Sql, ids: number[] | null): Prisma.Sql {
  if (ids === null) return Prisma.sql`TRUE`;
  if (ids.length === 0) return Prisma.sql`FALSE`;
  return Prisma.sql`${column} IN (${Prisma.join(ids)})`;
}

export function isInScope(scope: WarehouseScope, warehouseId: number): boolean;

// Writes: throws Error with statusCode 403 when out of effective scope.
export async function assertWarehouseInScope(warehouseId: number): Promise<void>;

// Reads by id: callers return 404 when false (do not reveal existence).
export async function canReadWarehouse(warehouseId: number): Promise<boolean>;

// Transfers: returns validated primary origin or throws a user-facing error.
export async function requirePrimaryWarehouse(): Promise<number>;
```

Reglas de implementación:
- Leer `User.primaryWarehouseId` y `warehouseViewMode` con **una** consulta, y `UserWarehouse` solo para roles restringidos.
- Reutilizar `WAREHOUSE_RESTRICTED_ROLES` de `auth-utils.ts` (exportarla); no duplicar la lista.
- Conservar `getAccessibleWarehouseIds`/`assertWarehouseAccess` reimplementándolos sobre el nuevo módulo para no romper a sus 5 consumidores, o migrar esos consumidores a `assertWarehouseInScope`.
- Para nombres de columna en SQL usar `Prisma.raw('es."warehouseId"')` (constantes, nunca input de usuario).
- **Lecturas** filtran por `effectiveIds`; **escrituras** validan contra `effectiveIds`; los **detalles por id** fuera de alcance responden **404**.

### 4.2 Endpoint del alcance para el cliente: `GET /api/me/warehouse-scope`

Requiere sesión. Respuesta `Cache-Control: private, no-store`:

```json
{
  "viewMode": "PRIMARY",
  "primaryWarehouse": { "id": 1, "name": "Central" },
  "effectiveWarehouses": [{ "id": 1, "name": "Central" }],
  "allowedWarehouses": [{ "id": 1, "name": "Central" }, { "id": 2, "name": "Norte" }],
  "needsPrimary": false
}
```

### 4.3 `GET /api/warehouses`

- Exigir sesión.
- Por defecto devolver **solo `effectiveIds`**.
- `?purpose=transfer-destination` devuelve todos los almacenes **excepto el principal** (R6).
- `?scope=all` devuelve todos los almacenes, solo con rol ADMIN o permiso `warehouses_manage` (lo usa `WarehouseAssignment`).
- Cambiar el header a `Cache-Control: private, no-store`. **Hoy es `public` y mezclaría respuestas entre usuarios.**

---

## 5. Fase 3 — Configuración personal y módulo Usuarios

### 5.1 Configuración (`src/app/(protected)/settings/page.tsx`)

- La página debe ser accesible para **cualquier usuario autenticado**.
- Sección nueva **"Mis preferencias de almacén"**, siempre visible:
  - Selector de vista: "Solo mi almacén principal" o "Todos mis almacenes (N)".
  - Almacén principal: solo lectura para no-ADMIN; selector entre permitidos para ADMIN.
  - Texto visible: **"Esta preferencia solo afecta a tu usuario."**
  - Si no hay principal válido: deshabilitar `PRIMARY` y mostrar "Pide a un administrador que asigne tu almacén principal".
- La sección de empresa existente (`SettingsForm`) solo se muestra si `hasPermission('settings_update')`.
- Eliminar la tarjeta "Próximamente: Usuarios" que queda redundante (opcional).
- `SidebarNav.tsx:35`: hacer visible `/settings` para cualquier usuario autenticado. Verificar cómo trata `SidebarNav` las rutas fuera del mapa.

### 5.2 Server action `updateMyWarehousePreferences` (en `settings/actions.ts`)

- Zod: `{ viewMode: z.nativeEnum(WarehouseViewMode), primaryWarehouseId?: number }`.
- El `userId` sale **solo de la sesión**; nunca aceptarlo del cliente.
- `primaryWarehouseId` solo se acepta si el rol es ADMIN y el almacén existe.
- Rechazar `PRIMARY` si no hay principal válido.
- Después de guardar: `revalidatePath("/", "layout")`. En el cliente, `router.refresh()`.
- Registrar auditoría si existe un helper de `AuditLog` para usuarios (`src/lib/audit`).

### 5.3 Usuarios (`src/components/users/WarehouseAssignment.tsx` y API)

- Agregar un selector **"Almacén principal"** para **cualquier rol**:
  - Roles restringidos: opciones = almacenes asignados.
  - Roles no restringidos: opciones = todos los almacenes (`/api/warehouses?scope=all`).
- Nuevo `PUT /api/users/[id]/primary-warehouse` (solo ADMIN) con body `{ primaryWarehouseId: number | null }` y validación de pertenencia a permitidos.
- `PUT /api/users/[id]/warehouses` existente: dentro de la **misma transacción**, si el principal actual queda fuera de las nuevas asignaciones, ponerlo en `NULL`.
- `updateUser` en `src/app/(protected)/users/actions.ts`: si el rol cambia a restringido y el principal no está asignado, ponerlo en `NULL`.
- Borrado de almacén (`warehouses/actions.ts`, `api/warehouses/[id]/route.ts`): manejar `P2003` (FK `RESTRICT` de `Request`) con el mensaje "El almacén tiene solicitudes asociadas". `User.primaryWarehouseId` se limpia solo (`SET NULL`).

---

## 6. Fase 4 — Cobertura por módulo

Regla general en cada archivo: obtener `const scope = await getWarehouseScope()` y aplicar
`warehouseIdFilter(scope.effectiveIds)` o `sqlWarehouseIn(...)`. Los filtros de la URL
(`warehouseId`) pasan por `narrowScope` y nunca amplían el alcance.

### 6.1 Inventario y movimientos

| Archivo | Cambio |
|---------|--------|
| `src/app/(protected)/stock-movements/page.tsx` | `where.warehouseId` en listado y `pendingCount`. Un PENDING de traslado cuenta si cualquiera de sus tramos está en alcance. |
| `src/app/(protected)/stock-movements/actions.ts` | Crear/editar/eliminar/aprobar/rechazar: `assertWarehouseInScope` sobre el almacén del movimiento cargado de la DB, no del payload. Traslados: §7. |
| `src/app/(protected)/stock-movements/actions-entry.ts` | Entrada múltiple: validar `warehouseId` en alcance. |
| `src/app/api/stock-movements/route.ts` | GET filtrado; POST ya valida y se cambia a `assertWarehouseInScope`. |
| `src/app/api/stock-movements/[id]/route.ts` | **Sin autenticación hoy**: agregar `requirePermission("stock_movements_manage")` y verificar alcance. PUT con lista blanca de campos y sin `data` crudo. |
| `src/app/api/stock-movements/export/route.ts` | Filtrar por alcance. |
| `src/app/(protected)/kardex/page.tsx` | Aplicar el alcance **a la consulta de saldos y a la de visualización** (líneas 136-160), y filtrar el selector de almacenes (línea 158). Verificar que los saldos se calculen sobre la secuencia completa del alcance; ver comentario en línea 129. |
| `src/app/api/epp-stocks/route.ts` | Exigir sesión; devolver 404 si `warehouseId` no está en alcance. |
| `src/app/api/import-inventory/route.ts` | Rechazar filas o columnas de almacenes fuera de alcance, con un mensaje claro. |

### 6.2 EPP (catálogo compartido; solo se filtran existencias)

| Archivo | Cambio |
|---------|--------|
| `src/app/api/epps/search/route.ts` | `stocks` y `aggregate` solo de almacenes en alcance; el catálogo no se filtra. |
| `src/app/(protected)/epps/page.tsx` | Usa `/api/warehouses`, ya filtrado. Mostrar el stock del alcance. |
| `src/app/(protected)/epps/actions.ts` | Crear EPP: mantener `EPPStock` en 0 para **todos** los almacenes (línea 58). Editar stock (líneas 96 y 111): **solo** modificar almacenes en alcance. **Cuidado con `updateMany` en línea 111: no debe tocar almacenes fuera de alcance.** El borrado de EPP sigue siendo global. |
| `src/components/epp/ModalEditEpp.tsx` | Mostrar y editar solo stocks en alcance. |
| `src/lib/export/epps-catalog-excel.ts` | Columnas de stock solo para almacenes en alcance. |

### 6.3 Entregas y devoluciones

| Archivo | Cambio |
|---------|--------|
| `src/app/(protected)/deliveries/page.tsx`, `api/deliveries/route.ts` | `batch.warehouseId` en alcance; filtro de URL con `narrowScope`. |
| `src/app/(protected)/deliveries/[id]/page.tsx`, `api/delivery-batches/[id]/route.ts`, `api/delivery-batches/[id]/pdf/route.ts`, `api/deliveries/[id]/route.ts` | Detalle fuera de alcance: `notFound()` / 404. |
| `src/app/api/delivery-batches/route.ts` | GET y `count` filtrados (línea 62 cuenta todo hoy). |
| `src/app/(protected)/deliveries/actions.ts` | Crear/editar/eliminar/anular: validar el almacén del lote cargado de la DB. |
| `api/deliveries/stats`, `api/deliveries/filters`, `api/deliveries/preview`, `api/deliveries/export`, `src/lib/export/deliveries-excel.ts` | Filtrar por alcance (`warehouseId` → lista de ids). |
| `src/app/(protected)/returns/page.tsx`, `api/return-batches/route.ts`, `api/return-batches/[id]/route.ts`, `returns/actions.ts` | Igual que entregas. |
| `src/app/api/available-batches/route.ts` | Filtrar `deliveryBatch` y el SQL crudo de la línea 27. |
| `src/app/api/suspicious-returns/route.ts` | Filtrar `returnBatch.warehouseId`. |
| `src/components/delivery/*`, `src/components/return/ReturnForm.tsx` | Preseleccionar el almacén principal con `/api/me/warehouse-scope`; las opciones salen de `/api/warehouses`. |

### 6.4 Dashboard, alertas y layout

| Archivo | Cambio |
|---------|--------|
| `src/lib/dashboard.ts` | `fetchDashboardData(scope)`: **todas** las consultas reciben `effectiveIds`. |
| ↳ stock bajo / crítico / por categoría (SQL) | Poner el filtro **en la condición del `LEFT JOIN`**: `LEFT JOIN "EPPStock" es ON e.id = es."eppId" AND ${sqlWarehouseIn(...)}`. **Si se pone en `WHERE`, desaparecen los EPP sin filas de stock y se ocultan los agotados.** |
| ↳ `delivery.count`, `returnItem.count/groupBy` | Filtrar por `batch: { warehouseId }`. |
| ↳ `ePPStock.aggregate`, `stockMovement.findMany` | Filtrar `warehouseId`. |
| ↳ `getTopDelivered`, `getDeliveriesByLocation`, tendencia, actividad mensual | Agregar `JOIN "DeliveryBatch"` cuando falte y filtrar `db."warehouseId"`; también en las subconsultas de `ReturnBatch`. |
| ↳ `getRecentActivity` | Filtrar `deliveryBatch` y `returnBatch`. |
| `src/lib/dashboard-cached.ts` | Clave `` `${CACHE_KEYS.DASHBOARD_KPIS}:${scope.cacheKey}` ``. |
| `src/lib/alerts.ts` (`getLowStockCount`) | Recibir el alcance y aplicar la misma regla del `LEFT JOIN`. |
| `src/app/(protected)/layout.tsx` | Mostrar un indicador del alcance activo ("Almacén: Central" o "Todos mis almacenes (2)") con link a `/settings`, y el aviso `needsPrimary`. |

Nota: `EPP.minStock` es global. Con alcance, se compara la suma del stock **dentro del alcance**
contra `minStock`. Los mínimos por almacén quedan fuera de alcance (§13).

### 6.5 Reportes y almacenes

| Archivo | Cambio |
|---------|--------|
| `src/lib/reports.ts` | Reemplazar `warehouseId?: number` por `warehouseIds: number[] \| null` (resultado de `narrowScope`) y usar `sqlWarehouseIn` en **todas** las consultas (líneas 114, 224, 227 solicitudes, 235-263 traslados). `fetchReportFilterData` lista solo almacenes en alcance. |
| `src/app/(protected)/reports/page.tsx`, `src/app/api/reports/export/route.ts` | Pasar el alcance. |
| `src/app/(protected)/warehouses/page.tsx` | Listar almacenes en alcance; ADMIN o `warehouses_manage` con vista `ALL` ven todos. |
| `src/lib/export/warehouse-stocks-excel.ts`, `api/warehouses/export/route.ts` | Filtrar por alcance. |
| `src/app/api/templates/epp-import/route.ts` | Columnas solo para almacenes en alcance. |

### 6.6 Auditoría

| Archivo | Cambio |
|---------|--------|
| `src/app/api/audit/delivery-consistency/route.ts` y `fix/route.ts` | Filtrar por alcance; `fix` valida el almacén de cada registro antes de modificarlo. |
| `audit-logs`, `performance` | Fuera de alcance: son administrativos y sin almacén. No modificar. |

### 6.7 Colaboradores

Catálogo compartido: no filtrar la lista. Si alguna vista muestra el historial de entregas de un
colaborador, ese historial sí se filtra por alcance.

---

## 7. Fase 5 — Traslados

### 7.1 Servidor (`stock-movements/actions.ts`, acción de traslado ~línea 129)

1. `const fromId = await requirePrimaryWarehouse()`. Si no hay principal válido, error: "Configura tu almacén principal para realizar traslados".
2. Si el cliente envía `fromId` distinto del principal, **rechazar** con "El origen del traslado debe ser tu almacén principal". Nunca usar el `fromId` del cliente.
3. `toId`: el almacén debe existir y ser `!== fromId`. **No** se exige que esté en `allowedIds` ni en la vista (R6).
4. Mantener la validación de stock en origen, el flujo de aprobación PENDING para no-ADMIN, el código de traslado y la creación de ambos tramos.
5. Aprobar o rechazar un traslado: visible y operable si **cualquiera** de los tramos está en el alcance efectivo de quien aprueba.
6. Editar o eliminar un tramo de traslado: validar alcance sobre el almacén de ese tramo.

### 7.2 Esquema (`src/schemas/transfer-schema.ts`)

- Hacer `fromId` opcional en `transferBatchSchema` y `transferSchema`; el servidor lo resuelve.
- Mantener las validaciones `fromId !== toId` en servidor después de resolver el origen.

### 7.3 UI (`src/components/stock/ModalCreateTransfer.tsx`)

- Origen: campo **solo lectura** con el nombre del principal (`/api/me/warehouse-scope`).
- Destino: opciones desde `/api/warehouses?purpose=transfer-destination`.
- Sin principal: deshabilitar el formulario y mostrar el aviso con link a Configuración.

---

## 8. Fase 6 — Caché y refresco

- Memoria (`src/lib/cache/memory-cache.ts`): toda clave de datos con alcance debe incluir `scope.cacheKey`. `invalidateDashboardCache` sigue usando `clear()`.
- HTTP: endpoints con alcance → `Cache-Control: private, no-store`.
- Después de cambiar preferencias o asignaciones: `revalidatePath("/", "layout")`.
- Al cambiar la vista, los listados vuelven a `page=1`. Si un `warehouseId` en la URL queda fuera de alcance, el resultado es vacío y la UI muestra "Fuera de tu alcance actual".

---

## 9. Fase 7 — Solicitudes por almacén

### 9.1 `POST /api/requests`

- Reemplazar `create({ data })` crudo por un esquema Zod: `{ eppId, quantity, employee, reason?, warehouseId? }`.
- `userId` desde la sesión. `warehouseId` por defecto = principal; exigir `assertWarehouseInScope`.
- Si no hay `warehouseId` ni principal, devolver 400.

### 9.2 `GET /api/requests` y `GET/PUT/DELETE /api/requests/[id]`

- Exigir `requests_manage` o `requests_approve`.
- Filtro: `warehouseId IN effectiveIds`.
- Solicitudes históricas con `warehouseId NULL`: visibles **solo** para usuarios no restringidos (`allowedIds === null`) con vista `ALL`, etiquetadas "Sin almacén". Los roles restringidos nunca las ven.
- PUT con lista blanca de campos, sin `data` crudo, y sin permitir cambiar `warehouseId` fuera de alcance.

### 9.3 `api/approvals` y `api/approvals/[id]`

- Exigir permiso (`requests_approve`) y filtrar por `request.warehouseId` en alcance.

### 9.4 Backfill de solicitudes históricas (NO automático)

- Crear `scripts/backfill-request-warehouse.ts`, **dry-run por defecto**:
  - Sin flags: reporta cuántas solicitudes tienen `warehouseId NULL`, agrupadas por usuario creador.
  - `--warehouse-id=<id> --apply`: asigna solo con un valor elegido explícitamente por el usuario, en una transacción y solo `WHERE "warehouseId" IS NULL`.
- **No inferir** el almacén desde el principal actual del creador.
- **No ejecutarlo en producción** sin aprobación explícita del usuario.

### 9.5 UI

`src/app/(protected)/requests/page.tsx` hoy es un placeholder. **No** construir el módulo de
solicitudes en este trabajo; solo garantizar que la API quede filtrada y validada.

---

## 10. Verificación

### 10.1 Estática (obligatoria antes de cada commit)

```powershell
pnpm exec prisma generate
pnpm exec tsc --noEmit
pnpm lint
pnpm build
```

`pnpm build` local **no** ejecuta migraciones; solo `vercel-build.sh` en Vercel lo hace.

### 10.2 Matriz manual sobre la rama de Neon

Crear o usar en la rama: almacenes A y B; usuarios `admin` (ADMIN), `jefeA` (WAREHOUSE_MANAGER
asignado a A, principal A), `sup2` (SUPERVISOR asignado a A y B, principal B), `sinAsig`
(SUPERVISOR sin asignaciones).

| Caso | Esperado |
|------|----------|
| `jefeA` con vista ALL o PRIMARY | Solo ve datos de A en dashboard, movimientos, Kardex, entregas, devoluciones, reportes, exportaciones y selectores. |
| `jefeA` abre por URL el detalle o PDF de una entrega de B | 404. |
| `jefeA` POST/PUT por API con `warehouseId=B` | 403. |
| `sup2` con vista ALL | Ve A+B; los totales del dashboard coinciden con `SUM(EPPStock)` de A+B. |
| `sup2` cambia a PRIMARY | Solo B; los totales coinciden con `SUM` de B y no ve datos de A. Los demás usuarios no cambian. |
| `sup2` traslada | Origen fijo B; destino A u otro almacén; un payload con `fromId=A` se rechaza. |
| `jefeA` traslada a B | Permitido (destino libre); queda PENDING si no es ADMIN. |
| `admin` aprueba el traslado con vista PRIMARY=A | Lo ve porque un tramo está en A. |
| `sinAsig` | Sistema vacío y aviso; no hay errores 500. |
| EPP agotado en el alcance sin filas `EPPStock` | Aparece en stock crítico (regla del `LEFT JOIN`). |
| Kardex con alcance | El saldo final por EPP y almacén coincide con `EPPStock.quantity`. |
| Quitar A de las asignaciones de `jefeA` | Su principal pasa a `NULL` y aparece el aviso. |
| `GET /api/warehouses` sin sesión | 401. |
| Solicitud nueva sin `warehouseId` | Toma el principal; las legacy `NULL` solo las ve ADMIN con ALL. |

### 10.3 Consultas de control (solo lectura)

```sql
-- Restricted users without assignments (they will see an empty system after deploy)
SELECT u.id, u.email, u.role FROM "User" u
WHERE u.role IN ('SUPERVISOR','WAREHOUSE_MANAGER')
  AND NOT EXISTS (SELECT 1 FROM "UserWarehouse" uw WHERE uw."userId" = u.id);

-- Users without a primary warehouse after migration
SELECT id, email, role FROM "User" WHERE "primaryWarehouseId" IS NULL AND "isActive" = true;

-- Legacy requests pending warehouse assignment
SELECT COUNT(*) FROM "Request" WHERE "warehouseId" IS NULL;

-- Stock per warehouse (compare against dashboard)
SELECT "warehouseId", SUM(quantity) FROM "EPPStock" WHERE quantity > 0 GROUP BY "warehouseId";
```

---

## 11. Commits y entregas

Usar conventional commits **sin atribución de IA**. Cada commit debe compilar (`tsc` + `build`).

**Entrega 1: solo la migración (expand)**
1. `feat(db): add user warehouse scope and request warehouse columns` — `schema.prisma` + migración. Sin cambios de comportamiento.

Desplegar la entrega 1 sola, verificar en producción (§12) y recién después continuar.

**Entrega 2: funcionalidad**
2. `feat(auth): centralize warehouse scope resolution` — `warehouse-scope.ts`, `/api/me/warehouse-scope`, `/api/warehouses`.
3. `feat(settings): add personal warehouse preferences`
4. `feat(users): assign primary warehouse`
5. `feat(stock): scope movements, kardex and transfers`
6. `feat(deliveries): scope deliveries and returns`
7. `feat(dashboard): scope dashboard, alerts and cache`
8. `feat(reports): scope reports and exports`
9. `feat(requests): filter requests by warehouse`
10. `fix(api): require auth on legacy inventory endpoints`

Si el diff supera ~400 líneas por PR, dividir siguiendo estos commits en PRs encadenados.

---

## 12. Procedimiento de despliegue a producción

1. **Pre-chequeo (lectura):** `pnpm exec prisma migrate status` contra producción. Debe indicar
   que la única pendiente es `20261104000000_add_user_warehouse_scope`. **Ante cualquier otra
   anomalía, detenerse e informar.**
2. Ejecutar las consultas de §10.3 en producción (lectura). Informar al usuario sobre usuarios
   restringidos sin asignaciones **antes** de la entrega 2, porque dejarán de ver datos.
3. **Respaldo:** pedir al usuario que cree, o autorice crear, una rama de Neon desde producción
   llamada `backup-pre-warehouse-scope-20261104`. No continuar sin ese respaldo.
4. Confirmar que `DIRECT_DATABASE_URL` está configurada en Vercel production (`vercel-build.sh` lo exige con pooler).
5. Merge a `master` → Vercel ejecuta `prisma migrate deploy` y luego `next build`.
6. **Post-deploy:** `prisma migrate status` sin pendientes; repetir los conteos de §3.3 paso 4 y comparar con el respaldo.
7. **Rollback:** usar Instant Rollback de Vercel al deploy anterior. **La migración no se revierte**:
   es aditiva y el código anterior la ignora. Nunca `DROP`, nunca reset. Si los datos se dañaran,
   el usuario decide si restaura desde la rama de respaldo.
8. Entrega 2: repetir los pasos 1, 5 y 6. No incluye migraciones; si aparece alguna, **detenerse**.

---

## 13. Fuera de alcance (no implementar sin aprobación)

- Switch global "aplicar a todos los usuarios": la preferencia es personal (R3).
- Stock mínimo por almacén (`minStock` sigue siendo global).
- UI completa del módulo de solicitudes.
- Volver `Request.warehouseId` `NOT NULL`.
- Filtrar `audit-logs` y `performance`.
- Agregar frameworks de tests o dependencias nuevas.

---

## 14. Checklist final del agente

- [ ] La migración es aditiva, sin `DROP`, `TRUNCATE`, `DELETE` ni `SET NOT NULL`.
- [ ] `migrate diff` vacío contra una shadow DB desechable.
- [ ] La migración fue probada con `migrate deploy` en una rama de Neon y los conteos se conservaron.
- [ ] No se ejecutaron `reset`, `db push` ni `migrate dev` contra producción.
- [ ] Todos los `prisma.*` y `$queryRaw` listados en §6 aplican el alcance.
- [ ] Los detalles por id fuera de alcance devuelven 404; las escrituras, 403.
- [ ] El origen de traslado está forzado por el servidor; el destino es libre.
- [ ] La clave de caché del dashboard incluye el alcance; `/api/warehouses` es `private, no-store`.
- [ ] El `LEFT JOIN` de stock bajo tiene el filtro en `ON`, no en `WHERE`.
- [ ] `tsc`, `lint` y `build` pasan.
- [ ] Commits convencionales sin atribución de IA.
