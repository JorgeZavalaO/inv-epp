import prisma from "@/lib/prisma";

/**
 * Seed de permisos con soporte de vista previa.
 * Uso:
 *   npx tsx scripts/seed-permissions.ts [--preview]
 *
 * --preview: no aplica cambios, solo muestra qué se crearía/actualizaría
 */

const args = process.argv.slice(2);
const PREVIEW = args.includes("--preview");

async function main() {
  const perms = [
    // Usuarios
    { name: "user_view", module: "users", description: "Ver usuarios" },
    { name: "user_create", module: "users", description: "Crear usuarios" },
    { name: "user_update", module: "users", description: "Editar usuarios" },
    { name: "user_delete", module: "users", description: "Eliminar/Desactivar usuarios" },
    { name: "assign_roles", module: "users", description: "Asignar permisos a usuarios" },

    // Entregas
    { name: "deliveries_manage", module: "deliveries", description: "Crear/editar/eliminar lotes de entrega" },
    { name: "deliveries_export", module: "deliveries", description: "Exportar Excel de entregas" },

    // Almacenes / Stocks
    { name: "warehouses_manage", module: "warehouses", description: "Crear/editar/eliminar almacenes" },
    { name: "warehouses_export", module: "warehouses", description: "Exportar stocks por almacén" },

    // EPPs
    { name: "epps_manage", module: "epps", description: "Crear/editar/eliminar EPPs e importación" },

    // Movimientos de stock
    { name: "stock_movements_manage", module: "stock", description: "Crear/eliminar movimientos de stock" },
    { name: "stock_transfers_manage", module: "stock", description: "Crear solicitudes de traslado entre almacenes" },
    { name: "stock_transfers_approve", module: "stock", description: "Aprobar o rechazar traslados entre almacenes" },

    // Devoluciones
    { name: "returns_manage", module: "returns", description: "Crear/eliminar lotes de devolución" },

    // Colaboradores
    { name: "collaborators_manage", module: "collaborators", description: "Crear/editar/eliminar colaboradores" },

    // Solicitudes
    { name: "requests_manage", module: "requests", description: "Crear/editar/eliminar solicitudes de EPP" },
    { name: "requests_approve", module: "requests", description: "Aprobar/rechazar solicitudes de EPP" },

    // Configuración
    { name: "settings_update", module: "settings", description: "Actualizar configuración del sistema" },

    // Auditoría y reportes (ejemplo)
    { name: "audit_view", module: "audit", description: "Ver registros de auditoría" },
    { name: "reports_export", module: "reports", description: "Exportar reportes" },
  ];

  let created = 0;
  let updated = 0;

  for (const p of perms) {
    const existing = await prisma.permission.findUnique({ where: { name: p.name } });

    if (PREVIEW) {
      console.log(
        existing
          ? `🟡 Update → ${p.name} ({ module: ${p.module} })`
          : `🟢 Create → ${p.name} ({ module: ${p.module} })`
      );
      continue;
    }

    if (existing) {
      await prisma.permission.update({
        where: { name: p.name },
        data: { description: p.description, module: p.module },
      });
      updated++;
    } else {
      await prisma.permission.create({
        data: { name: p.name, module: p.module, description: p.description },
      });
      created++;
    }
  }

  if (PREVIEW) {
    console.log(`\n🔎 Vista previa completada. Total: ${perms.length} permisos.`);
  } else {
    console.log(`\n✅ Seed completado. Creados: ${created}, Actualizados: ${updated}. Total: ${created + updated}.`);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
