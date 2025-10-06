import { z } from 'zod';
import { UserRole } from '@prisma/client';

/**
 * Schema para crear un nuevo usuario
 */
export const createUserSchema = z.object({
  email: z.string().email({ message: 'Email inválido' }),
  name: z.string().min(2, { message: 'El nombre debe tener al menos 2 caracteres' }),
  password: z.string().min(6, { message: 'La contraseña debe tener al menos 6 caracteres' }),
  role: z.nativeEnum(UserRole, { message: 'Rol inválido' }),
  image: z.string().url().optional().nullable(),
});

/**
 * Schema para actualizar un usuario (sin contraseña)
 */
export const updateUserSchema = z.object({
  id: z.string(),
  email: z.string().email({ message: 'Email inválido' }),
  name: z.string().min(2, { message: 'El nombre debe tener al menos 2 caracteres' }),
  role: z.nativeEnum(UserRole, { message: 'Rol inválido' }),
  image: z.string().url().optional().nullable(),
});

/**
 * Schema para cambiar contraseña
 */
export const changePasswordSchema = z.object({
  userId: z.string(),
  newPassword: z.string().min(6, { message: 'La contraseña debe tener al menos 6 caracteres' }),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

/**
 * Schema para asignar permisos
 */
export const assignPermissionsSchema = z.object({
  userId: z.string(),
  permissionIds: z.array(z.string()), // String porque Permission.id es CUID
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type AssignPermissionsInput = z.infer<typeof assignPermissionsSchema>;
