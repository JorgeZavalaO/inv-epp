import prisma from "@/lib/prisma";

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

  for (const p of perms) {
    await prisma.permission.upsert({
      where: { name: p.name },
      update: { description: p.description, module: p.module },
      create: { name: p.name, module: p.module, description: p.description },
    });
  }

  console.log(`Seeded ${perms.length} permissions.`);
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
