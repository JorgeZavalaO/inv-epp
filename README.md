# EPP Manager

EPP Manager es una aplicación para administrar el inventario de Equipos de Protección Personal (EPP). Permite registrar artículos, controlar el stock de múltiples almacenes y llevar un historial de entregas y devoluciones. Además cuenta con un panel de control con indicadores clave y gráficos.

## Funcionalidades principales

- Gestión de EPP y categorías.
- Control de stock por almacén.
- Registro de entregas y devoluciones.
- Solicitudes internas de EPP y aprobaciones.
- Panel de dashboard con KPIs y gráficas.
- Autenticación de usuarios mediante Clerk.

## Instalación

1. Clona el repositorio y entra en la carpeta del proyecto.
2. Instala las dependencias con **pnpm** (o npm):

```bash
pnpm install
```

3. Configura las variables de entorno necesarias, por ejemplo:

- `DATABASE_URL` – cadena de conexión para PostgreSQL.
- Variables de Clerk (`CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, ...).

4. Ejecuta las migraciones de Prisma:

```bash
npx prisma migrate deploy
```

5. Inicia el servidor de desarrollo:

```bash
pnpm dev
```

Visita <http://localhost:3000> para ver la aplicación.

## Construcción para producción

```bash
pnpm build
pnpm start
```

## Tecnologías usadas

- [Next.js 15](https://nextjs.org/)
- [React 19](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Prisma](https://www.prisma.io/) + PostgreSQL
- [Clerk](https://clerk.com/) para autenticación
