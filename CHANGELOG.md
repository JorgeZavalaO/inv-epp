# Changelog

Todos los cambios notables en este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto se adhiere a [Semantic Versioning](https://semver.org/lang/es/).

## [1.3.0] - 2026-02-17

### ✨ Agregado

#### Modal de Devolución Mejorado
- **Selección de almacén editable** en el formulario de devolución (ReturnForm)
- Combobox de almacenes cargado desde `/api/warehouses` con búsqueda en tiempo real
- **Eliminación de líneas de productos** que no se desean devolver con botón Basura
- Tabla de items mejorada con:
  - Encabezados claros (Código, Nombre, Entregado, Devolver, Acciones)
  - Tarjeta con bordes y sombreado para mejor visual
  - Botones de acción individuales para cada línea
  - Texto guía instructivo: "Elimina las líneas que no quieras devolver o ajusta sus cantidades"
  - Input de cantidad centrado con validación
- Almacén sugerido desde la entrega pero modificable por el usuario
- Mejor UX general del formulario con espaciado y colores coherentes

#### Endpoints de Debugging
- **`GET /api/suspicious-returns`** - Investiga devoluciones sospechosas
  - Parámetros: `warehouseId` (number), `eppIds` (comma-separated)
  - Retorna: quién creó la devolución, cuándo, cuánto se devolvió de cada EPP
  - Útil para auditar: "¿Por qué se devolvieron más unidades de las entregadas?"

### 🐛 Corregido

#### ⚠️ CRÍTICO: Disponibilidad de Entregas Incorrecta
- **Bug: Entregas con múltiples productos no aparecían en el selector de devoluciones**
- **Causa raíz:** El query en `/api/available-batches` sumaba TODAS las devoluciones del almacén por EPP, sin distinguir entregas
  - Ejemplo: DEV-0001 (cancelada DEL-0168, almacén 14) contaba para DEL-0200 (también almacén 14)
  - Resultado: DEL-0200 mostraba "devuelto=26, entregado=12" → excluido incorrectamente
- **Solución:** Query modificado para contar SOLO devoluciones vinculadas a esa entrega específica
  - Antes: `GROUP BY rb."warehouseId", ri."eppId"` (agrupa por almacén + EPP)
  - Ahora: `GROUP BY rb."cancelledDeliveryBatchId", ri."eppId"` (agrupa por entrega + EPP)
  - Filtro: `WHERE rb."cancelledDeliveryBatchId" IS NOT NULL` (solo cancellaciones vinculadas)
- Entregas como DEL-0200 y DEL-0199 ahora correctamente disponibles para devolución

#### Manejo de Errores en Carga de Entregas
- Toast de error visible cuando falla la carga de entregas disponibles (`/api/available-batches`)
- Toast de error cuando falla la carga de detalles de entrega (`/api/delivery-batches/[id]`)
- Console logs detallados para debugging en desarrollo
- Validación robusta de estructura de datos en la respuesta

## [1.2.0] - 2026-01-10

### ✨ Agregado

#### Sistema de Anulación de Entregas
- **Anulación completa de entregas por lote** con transacciones atómicas
- Devolución automática de stock al almacén (creación de devolución DEV-XXXX)
- Captura de razón de anulación en el modal de confirmación
- Campos en modelo `DeliveryBatch`: `isCancelled`, `cancelledAt`, `cancelledBy`, `cancellationReason`
- Auditoría completa: logs en tabla `AuditLog` con contexto de cancelación
- Visualización de estado cancelado con badge distintivo en listados
- Información de cancelación mostrada en detalle de entrega
- Movimientos de stock registrados como ENTRY con etiqueta [ANULACIÓN] y razón incluida

### 🐛 Corregido

#### Visibilidad de Anulaciones en Movimientos de Stock
- **Notas mejoradas en movimientos de stock** que incluyen:
  - Etiqueta clara [ANULACIÓN] para identificar devoluciones por cancelación
  - Código de entrega original y devolución generada
  - Razón de anulación capturada del usuario
  - Formato: `[ANULACIÓN] DEL-XXXX → DEV-YYYY | Razón: {motivo del usuario}`
- Mejora de trazabilidad en el kardex para operaciones de devolución

#### Problemas de Cache en Listado de Entregas
- **Cache invalidation mejorada** con `router.refresh()` inmediato
- Fetch con header `cache: 'no-store'` para garantizar datos frescos
- Delay de sincronización (500ms) en modal de cancelación para confirmación de BD
- Actualización correcta del listado tras operación de cancelación

## [1.1.0] - 2026-01-09

### ✨ Agregado

#### Búsqueda en Tiempo Real del Catálogo de EPPs
- **Búsqueda inmediata por cada letra tipeada** en código, nombre o categoría
- Endpoint API dedicado `/api/epps/search` para búsqueda completa con todos los datos
- Debouncing inteligente de 300ms para optimizar performance
- Indicador visual de carga con spinner animado durante búsqueda
- Botón de limpiar búsqueda (X) integrado en el input
- Estadísticas dinámicas: "X productos • Y unidades totales"
- Actualización de URL con parámetros de búsqueda para compartir enlaces
- Auto-focus en input cuando hay búsqueda activa
- Componente convertido de server-side a client-side para reactividad inmediata

#### Campo de Precio Unitario (unitPrice)
- **Nuevo campo `unitPrice`** en movimientos de stock para registrar precio por unidad
- Tipo: `Decimal(10,2)` para precisión monetaria
- Soporte en:
  - Movimientos individuales (Entrada, Salida, Ajuste)
  - Entrada rápida por lote de múltiples productos
  - Exportación a Excel con formato de moneda
- Validación Zod: precio ≥ 0, campo opcional
- UI mejorada con focus ring en color verde para diferenciarlo
- Placeholder claro (0.00) y support para valores decimales

#### Campo de Orden de Compra (purchaseOrder)
- **Nuevo campo `purchaseOrder`** en movimientos para trazabilidad de compras
- Tipo: `String` (máximo 100 caracteres)
- Proporciona trazabilidad completa de las compras
- Validación de longitud en formularios
- UI mejorada con focus ring en color púrpura
- Disponible en:
  - Movimientos individuales
  - Entrada rápida por lote
  - Modales de edición

#### Mejoras de UX/UI en Modales
- **Modal "Entrada rápida de productos":**
  - Estructura con secciones numeradas (1, 2, 3)
  - Encabezado mejorado con título y subtítulo descriptivo
  - Tarjetas de producto con efecto hover suave
  - Separadores visuales entre secciones con bordes
  - Labels mejorados en mayúsculas con descripción de ayuda
  - Mejor espaciado consistente (space-y-6)
  - Responsive: stack vertical en móvil, horizontal en desktop

- **Modal "Nuevo Movimiento":**
  - Estructura clara con secciones numeradas y colores diferenciados
  - Encabezado mejorado con descripción
  - Display mejorado de stock con colores (verde/rojo) y emoji
  - Campos agrupados por categoría
  - Focus rings de colores según tipo (azul, verde, púrpura)
  - Placeholders descriptivos y texto de ayuda
  - Botones con textos descriptivos ("Guardar movimiento" vs solo "Guardar")
  - Indicador de carga durante el guardado

- **Características globales:**
  - Mensajes de error con emojis (⚠️) y fondo rojo suave
  - Transiciones suaves en hovers y focus states
  - Mejor contraste y legibilidad
  - Emojis contextuales para tipos de movimiento (📥, 📤, 🔧)
  - Max-width y overflow-y para modales largos

### 🔧 Técnico

#### Base de Datos
- **Migración `unitPrice`:** Agregado campo Decimal(10,2) a tabla StockMovement sin perder datos
- **Migración `purchaseOrder`:** Agregado campo String a tabla StockMovement sin perder datos
- Migraciones aplicadas usando `prisma db push` para no requerir reset en producción
- Índices existentes mantenidos para performance

#### API
- **Nueva ruta:** `/api/epps/search` - Búsqueda completa con stocks y movimientos
- **Permiso verificado:** `epps_manage` requerido para acceso al endpoint
- **Optimización:** Límite de 100 resultados para performance en búsqueda en tiempo real
- **Formato:** Devuelve datos completos incluyendo stocks por almacén

#### Frontend
- **Página `/epps` convertida a client-side component** para búsqueda reactiva
- **Tipos TypeScript estrictos:** Eliminación de tipos `any`
- **Interfaz `EPPFromAPI`** para tipado correcto de datos de la API
- **Hooks utilizados:**
  - `useState` para estado local (query, data, isLoading, warehouses)
  - `useEffect` para búsqueda y actualización de URL
  - `useCallback` para funciones memoizadas
  - `useMemo` para estadísticas calculadas
  - `useDebounce` para debouncing inteligente (300ms)

#### Validación
- **Zod schemas actualizados:**
  - `stock-movement-schema.ts` con validación de unitPrice y purchaseOrder
  - `entry-batch-schema.ts` con soporte para precio en items
- **Tipos TypeScript:** Actualización completa con nuevos campos

#### Acciones de Servidor
- **`actions-entry.ts`:** Actualizado para procesar campo unitPrice en entrada por lote
- **Mapeo de FormData:** Incluye conversión de unitPrice a número

### 🎨 Estilos y Componentes
- **Imports limpios:** Removidos imports no usados (Textarea)
- **Gradientes mejorados:** Backgrounds con gradientes azul suave
- **Colores contextuales:**
  - Azul: Campos principales, búsqueda
  - Verde: Stock positivo, campos de precio
  - Rojo: Stock negativo, errores
  - Púrpura: Orden de compra
- **Responsividad:** Grid layouts adaptables (grid-cols-1 md:grid-cols-2/3)

### ✅ Validación y Calidad
- **Build:** ✅ Exitoso sin errores
- **Linting:** ✅ Limpio (sin variables no usadas)
- **TypeScript:** ✅ Tipos correctos (sin `any`)
- **Migraciones:** ✅ Aplicadas sin data loss
- **Permisos:** ✅ Verificados en endpoint de búsqueda

### 📊 Performance
- **Debouncing:** 300ms para búsqueda en tiempo real
- **Límite de resultados:** 100 items por búsqueda
- **Caching:** Warehouses cargados una sola vez al montar
- **Optimización:** useCallback y useMemo para evitar re-renders

### 📝 Documentación
- **README.md:** Actualizado con nuevas características de búsqueda, precio y órdenes de compra
- **CHANGELOG.md:** Creado con historial completo de cambios

---

## [1.2.0] - 2026-01-22

### ✨ Agregado

#### Módulo de Kardex Completo
- **Nueva página `/kardex`** bajo rutas protegidas (Inventario)
- Filtros avanzados: búsqueda por texto, EPP, almacén, tipo (Entrada/Salida/Ajuste), rango de fechas
- Tabla con columnas de movimiento, cantidades y saldos:
  - Tipo de movimiento (Entrada/Salida/Ajuste)
  - Cantidad
  - Operador y nota
  - **Saldo inicial** por fila (previo al movimiento)
  - **Saldo** resultante por fila (después del movimiento)
- Cálculos de saldo corrido por EPP/almacén (ordenado asc por fecha)
- Totales agregados por filtro activo (Entradas/Salidas/Ajustes)
- Acceso controlado por permiso `stock_movements_manage`

#### Auditoría de Entregas: Causa e Impacto
- Se añaden explicaciones de **causa** e **impacto** para issues de consistencia de entregas:
  - `MISSING_MOVEMENT`, `QUANTITY_MISMATCH`, `ORPHAN_MOVEMENT`
- Campo adicional `daysSinceCreation` para apoyar el análisis temporal
- Bloque visual “Causa e Impacto” en el UI del componente de auditoría

### 🛠️ Cambiado
- Diálogo de confirmación de “Aplicar Corrección” ahora **controlado por estado** (evita triggers frágiles)
- Normalización de payload de corrección: soporte para `movementId` (singular) y `movementIds` (arreglo)
- Mensajería y validación de acciones mejoradas en cliente (toasts más claros)

### 🐞 Corregido
- Error “**Acción no soportada**” al aplicar correcciones en auditoría:
  - Validación de acción y parámetros requerida antes de enviar
  - Soporte consistente para IDs de movimiento (singular vs múltiple)
  - Cierre fiable del diálogo tras éxito
- Alineación de tipos entre UI y API (incluye `daysSinceCreation` en Issue)

### 🔧 Técnico
- Endpoint de fix de auditoría soporta:
  - `DELETE_MOVEMENT`: revierte stock y elimina movimiento
  - `UPDATE_DELIVERY`: ajusta cantidad y genera movimiento de ajuste si corresponde
  - `CREATE_MOVEMENT`: crea salida y descuenta stock
- Registro de auditoría para operaciones de corrección
- Scripts de verificación:
  - `scripts/test-causes.js` — valida generación de causas e impactos
  - `scripts/test-fix-flow.js` — prueba end-to-end del flujo de corrección (18/18 pasan)

### 📄 Documentación
- **README** actualizado para incluir el módulo **Kardex** y su funcionamiento

### 🗃️ Migraciones
- No se requieren migraciones de base de datos para esta versión

---

## [1.2.1] - 2026-01-30

### ✨ Agregado

- **Columna de Estado en Movimientos**
  - Se agregó la columna `Estado` en la tabla de movimientos para mostrar claramente si un movimiento está `PENDING`, `APPROVED` o `REJECTED`.
  - Badges con colores e íconos: Pendiente (amarillo), Aprobado (verde), Rechazado (rojo).
  - Los movimientos rechazados muestran un botón para ver la razón del rechazo en un modal.

- **Paginación personalizable**
  - Paginación por defecto configurada a **20** movimientos por página.
  - Selector en la interfaz permite elegir 5, 10, 20, 50 o 100 items por página; la preferencia se persiste en la URL (`pageSize`).
  - Validación de `pageSize` en servidor: mínimo 5, máximo 100.

### 🔧 Cambiado

- Los botones de editar/eliminar ahora están deshabilitados para movimientos rechazados para evitar acciones inconsistentes.


## [1.0.0] - 2025-11-14

### Versión inicial con funcionalidades principales

#### Características Principales Incluidas
- Gestión completa de catálogo de EPPs
- Control de inventario multi-almacén
- Sistema de entregas con PDF automático
- Gestión de devoluciones
- Base de datos de colaboradores
- Dashboard con KPIs
- Reportería avanzada
- Sistema de auditoría completo
- Autenticación con Auth.js y roles
- Perfil de usuario con avatar
- Exportación a Excel
- Performance optimizado con índices de BD
- Sistema de aprobación de movimientos

---

## Notas de Migración

### De 1.0.0 a 1.1.0

No se requiere reset de base de datos. Los nuevos campos son opcionales y backward-compatible:

1. **Aplicar migraciones:**
   ```bash
   npx prisma migrate deploy
   ```

2. **Generar cliente Prisma:**
   ```bash
   npx prisma generate
   ```

3. **La búsqueda en tiempo real es automática:**
   - No requiere configuración adicional
   - Los datos existentes son buscables inmediatamente

4. **Nuevos campos son opcionales:**
   - `unitPrice`: Opcional en todos los movimientos
   - `purchaseOrder`: Opcional en todos los movimientos

### Data Migration
- ✅ Datos existentes se mantienen intactos
- ✅ Nuevos campos aceptan NULL por defecto
- ✅ No se requiere script de migración de datos
- ✅ Histórico completo de movimientos preservado

---

## Roadmap Futuro

### Próximas características planeadas:
- [ ] Búsqueda avanzada con filtros múltiples
- [ ] Reportes personalizables por rol
- [ ] Integraciones con sistemas ERP
- [ ] Aplicación móvil nativa
- [ ] Sincronización offline
- [ ] Notificaciones en tiempo real (WebSockets)
- [ ] Análisis predictivo con ML
- [ ] Dashboard colaborativo
