# Changelog

Todos los cambios notables en este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto se adhiere a [Semantic Versioning](https://semver.org/lang/es/).

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
