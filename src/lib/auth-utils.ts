import { auth } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import prisma from "./prisma";

/**
 * Obtener la sesión del usuario actual
 */
export async function getCurrentUser() {
  const session = await auth();
  return session?.user;
}

/**
 * Verificar si el usuario tiene un rol específico
 */
export async function hasRole(role: UserRole): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  return user.role === role;
}

/**
 * Verificar si el usuario tiene al menos uno de los roles especificados
 */
export async function hasAnyRole(roles: UserRole[]): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  return roles.includes(user.role as UserRole);
}

/**
 * Verificar si el usuario tiene un permiso específico
 */
export async function hasPermission(permissionName: string): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  // Los ADMIN tienen todos los permisos
  if (user.role === "ADMIN") return true;

  // Verificar permiso en la base de datos
  const userPermission = await prisma.userPermission.findFirst({
    where: {
      userId: user.id,
      permission: {
        name: permissionName,
      },
    },
  });

  return !!userPermission;
}

/**
 * Verificar si el usuario tiene AL MENOS UNO de los permisos especificados (OR)
 */
export async function hasAnyPermission(
  permissionNames: string[],
): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  // Los ADMIN tienen todos los permisos
  if (user.role === "ADMIN") return true;

  // Verificar si tiene al menos uno de los permisos
  const userPermission = await prisma.userPermission.findFirst({
    where: {
      userId: user.id,
      permission: {
        name: {
          in: permissionNames,
        },
      },
    },
  });

  return !!userPermission;
}

/**
 * Verificar si el usuario tiene todos los permisos especificados
 */
export async function hasAllPermissions(
  permissionNames: string[],
): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  // Los ADMIN tienen todos los permisos
  if (user.role === "ADMIN") return true;

  // Verificar todos los permisos
  const userPermissions = await prisma.userPermission.findMany({
    where: {
      userId: user.id,
      permission: {
        name: {
          in: permissionNames,
        },
      },
    },
  });

  return userPermissions.length === permissionNames.length;
}

/**
 * Jerarquía de roles
 */
const ROLE_HIERARCHY: Record<UserRole, number> = {
  ADMIN: 5,
  SUPERVISOR: 4,
  WAREHOUSE_MANAGER: 3,
  OPERATOR: 2,
  VIEWER: 1,
};

/**
 * Verificar si el usuario tiene un rol con nivel igual o superior
 */
export async function hasRoleLevel(minRole: UserRole): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  const userLevel = ROLE_HIERARCHY[user.role as UserRole] || 0;
  const minLevel = ROLE_HIERARCHY[minRole];

  return userLevel >= minLevel;
}

/**
 * Obtener permisos del usuario
 */
export async function getUserPermissions(): Promise<string[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const permissions = await prisma.userPermission.findMany({
    where: { userId: user.id },
    include: { permission: true },
  });

  return permissions.map((up) => up.permission.name);
}

/**
 * Wrapper para requerir autenticación
 */
export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("No autenticado");
  }
  return user;
}

/**
 * Obtener usuario completo con datos de la base de datos
 * (Similar a ensureClerkUser pero para Auth.js)
 */
export async function ensureAuthUser() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Usuario no autenticado");
  }

  // Obtener datos completos del usuario desde la base de datos
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      image: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new Error("Usuario no encontrado en la base de datos");
  }

  return user;
}

/**
 * Wrapper para requerir un rol específico
 */
export async function requireRole(role: UserRole) {
  const user = await requireAuth();
  if (user.role !== role && user.role !== "ADMIN") {
    throw new Error("No autorizado - Rol insuficiente");
  }
  return user;
}

/**
 * Wrapper para requerir nivel de rol mínimo
 */
export async function requireRoleLevel(minRole: UserRole) {
  const user = await requireAuth();
  const hasLevel = await hasRoleLevel(minRole);

  if (!hasLevel) {
    throw new Error("No autorizado - Nivel de rol insuficiente");
  }

  return user;
}

/**
 * Wrapper para requerir un permiso específico
 */
export async function requirePermission(permissionName: string) {
  const user = await requireAuth();
  const hasPerm = await hasPermission(permissionName);

  if (!hasPerm) {
    throw new Error(`No autorizado - Permiso requerido: ${permissionName}`);
  }

  return user;
}

/**
 * Roles que tienen restricción de almacenes. ADMIN y roles inferiores quedan sin restricción.
 */
const WAREHOUSE_RESTRICTED_ROLES: UserRole[] = [
  "SUPERVISOR",
  "WAREHOUSE_MANAGER",
];

/**
 * Devuelve los IDs de almacenes accesibles para el usuario en sesión.
 * - null  → sin restricción (ADMIN, OPERATOR, VIEWER)
 * - number[] → lista de IDs permitidos (puede ser vacía si no tiene asignaciones)
 */
export async function getAccessibleWarehouseIds(): Promise<number[] | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  if (!WAREHOUSE_RESTRICTED_ROLES.includes(user.role as UserRole)) return null;

  const assignments = await prisma.userWarehouse.findMany({
    where: { userId: user.id },
    select: { warehouseId: true },
  });

  return assignments.map((a) => a.warehouseId);
}

/**
 * Lanza un error 403 si el usuario con rol SUPERVISOR o WAREHOUSE_MANAGER
 * no tiene el almacén dado entre sus asignaciones.
 * Para otros roles no hace nada (sin restricción).
 */
export async function assertWarehouseAccess(
  warehouseId: number,
): Promise<void> {
  const allowed = await getAccessibleWarehouseIds();
  if (allowed === null) return; // sin restricción

  if (!allowed.includes(warehouseId)) {
    const error = new Error("No autorizado - Sin acceso al almacén solicitado");
    (error as Error & { statusCode: number }).statusCode = 403;
    throw error;
  }
}
