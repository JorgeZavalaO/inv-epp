"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { hash } from "bcryptjs";
import {
  createUserSchema,
  updateUserSchema,
  changePasswordSchema,
  assignPermissionsSchema,
  type CreateUserInput,
  type UpdateUserInput,
  type ChangePasswordInput,
  type AssignPermissionsInput,
} from "@/schemas/user-schema";
import { requirePermission } from "@/lib/auth-utils";
import { UserRole } from "@prisma/client";

/**
 * Obtener todos los usuarios con sus roles y permisos
 */
export async function getUsers() {
  await requirePermission("user_view");

  return prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      image: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          permissions: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

/**
 * Obtener un usuario por ID con detalles completos
 */
export async function getUserById(userId: string) {
  await requirePermission("user_view");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      image: true,
      createdAt: true,
      updatedAt: true,
      permissions: {
        include: {
          permission: true,
        },
      },
    },
  });

  if (!user) {
    throw new Error("Usuario no encontrado");
  }

  return user;
}

/**
 * Crear un nuevo usuario
 */
export async function createUser(input: CreateUserInput) {
  await requirePermission("user_create");

  // Validar entrada
  const data = createUserSchema.parse(input);

  // Verificar que el email no exista
  const existingUser = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (existingUser) {
    throw new Error("Ya existe un usuario con este email");
  }

  // Hash de la contraseña
  const hashedPassword = await hash(data.password, 10);

  // Crear usuario
  const user = await prisma.user.create({
    data: {
      email: data.email,
      name: data.name,
      password: hashedPassword,
      role: data.role,
      image: data.image,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  });

  revalidatePath("/users");
  return user;
}

/**
 * Actualizar un usuario
 */
export async function updateUser(input: UpdateUserInput) {
  await requirePermission("user_update");

  // Validar entrada
  const data = updateUserSchema.parse(input);

  // Verificar que el usuario existe
  const existingUser = await prisma.user.findUnique({
    where: { id: data.id },
  });

  if (!existingUser) {
    throw new Error("Usuario no encontrado");
  }

  // Verificar que el email no esté en uso por otro usuario
  if (data.email !== existingUser.email) {
    const emailInUse = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (emailInUse) {
      throw new Error("El email ya está en uso por otro usuario");
    }
  }

  // Detectar si cambió el rol
  const roleChanged = data.role !== existingUser.role;

  // Actualizar usuario
  const user = await prisma.user.update({
    where: { id: data.id },
    data: {
      email: data.email,
      name: data.name,
      role: data.role,
      image: data.image,
      updatedAt: new Date(),
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  });

  // Registrar en auditoría si cambió el rol
  if (roleChanged) {
    await prisma.auditLog.create({
      data: {
        action: 'UPDATE',
        entityType: 'USER',
        entityId: 0,
        userId: existingUser.id,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        metadata: {
          userId: user.id,
          description: `Rol cambiado de ${existingUser.role} a ${data.role}`,
          previousRole: existingUser.role,
          newRole: data.role,
        },
      },
    });
  }

  revalidatePath("/users");
  
  // Retornar información adicional sobre si cambió el rol
  return {
    ...user,
    roleChanged,
    previousRole: roleChanged ? existingUser.role : undefined,
  };
}

/**
 * Cambiar contraseña de un usuario
 */
export async function changeUserPassword(input: ChangePasswordInput) {
  await requirePermission("user_update");

  // Validar entrada
  const data = changePasswordSchema.parse(input);

  // Verificar que el usuario existe
  const user = await prisma.user.findUnique({
    where: { id: data.userId },
  });

  if (!user) {
    throw new Error("Usuario no encontrado");
  }

  // Hash de la nueva contraseña
  const hashedPassword = await hash(data.newPassword, 10);

  // Actualizar contraseña
  await prisma.user.update({
    where: { id: data.userId },
    data: {
      password: hashedPassword,
    },
  });

  return { success: true };
}

/**
 * Eliminar (soft delete) un usuario
 * En lugar de eliminar, podríamos cambiar su rol a VIEWER y revocar permisos
 */
export async function deleteUser(userId: string) {
  await requirePermission("user_delete");

  // Verificar que el usuario existe
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error("Usuario no encontrado");
  }

  // No permitir eliminar el último ADMIN
  if (user.role === UserRole.ADMIN) {
    const adminCount = await prisma.user.count({
      where: { role: UserRole.ADMIN },
    });

    if (adminCount <= 1) {
      throw new Error("No se puede eliminar el último administrador del sistema");
    }
  }

  // Soft delete: cambiar a VIEWER y revocar todos los permisos
  await prisma.$transaction([
    prisma.userPermission.deleteMany({
      where: { userId },
    }),
    prisma.user.update({
      where: { id: userId },
      data: {
        role: UserRole.VIEWER,
        // Opcional: agregar un campo deletedAt si lo tienes en el schema
      },
    }),
  ]);

  revalidatePath("/users");
  return { success: true };
}

/**
 * Obtener todos los permisos disponibles
 */
export async function getAllPermissions() {
  await requirePermission("user_view");

  return prisma.permission.findMany({
    orderBy: [
      { module: "asc" },
      { name: "asc" }, // Cambiar de action a name
    ],
  });
}

/**
 * Obtener permisos de un usuario
 */
export async function getUserPermissions(userId: string) {
  await requirePermission("user_view");

  return prisma.userPermission.findMany({
    where: { userId },
    include: {
      permission: true,
    },
  });
}

/**
 * Asignar permisos a un usuario
 */
export async function assignPermissions(input: AssignPermissionsInput) {
  await requirePermission("assign_roles");

  // Validar entrada
  const data = assignPermissionsSchema.parse(input);

  // Verificar que el usuario existe
  const user = await prisma.user.findUnique({
    where: { id: data.userId },
  });

  if (!user) {
    throw new Error("Usuario no encontrado");
  }

  // Eliminar permisos existentes y agregar los nuevos en una transacción
  await prisma.$transaction([
    prisma.userPermission.deleteMany({
      where: { userId: data.userId },
    }),
    prisma.userPermission.createMany({
      data: data.permissionIds.map((permissionId) => ({
        userId: data.userId,
        permissionId,
      })),
      skipDuplicates: true,
    }),
  ]);

  revalidatePath("/users");
  return { success: true };
}

/**
 * Agregar un permiso individual a un usuario
 */
export async function addPermissionToUser(userId: string, permissionId: string) {
  await requirePermission("assign_roles");

  // Verificar que el usuario existe
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error("Usuario no encontrado");
  }

  // Verificar que el permiso existe
  const permission = await prisma.permission.findUnique({
    where: { id: permissionId },
  });

  if (!permission) {
    throw new Error("Permiso no encontrado");
  }

  // Agregar permiso (skipDuplicates evita error si ya existe)
  await prisma.userPermission.create({
    data: {
      userId,
      permissionId,
    },
  });

  revalidatePath("/users");
  return { success: true };
}

/**
 * Quitar un permiso individual de un usuario
 */
export async function removePermissionFromUser(userId: string, permissionId: string) {
  await requirePermission("assign_roles");

  // Verificar que el usuario existe
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error("Usuario no encontrado");
  }

  // Quitar permiso
  await prisma.userPermission.deleteMany({
    where: {
      userId,
      permissionId,
    },
  });

  revalidatePath("/users");
  return { success: true };
}

/**
 * Obtener estadísticas de usuarios
 */
export async function getUserStats() {
  await requirePermission("user_view");

  const [total, byRole, recentUsers] = await Promise.all([
    prisma.user.count(),
    prisma.user.groupBy({
      by: ["role"],
      _count: true,
    }),
    prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    }),
  ]);

  return {
    total,
    byRole: byRole.map((r) => ({
      role: r.role,
      count: r._count,
    })),
    recentUsers,
  };
}
