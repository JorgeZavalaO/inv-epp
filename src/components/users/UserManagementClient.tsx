"use client";

import { useEffect, useState, useTransition } from 'react';
import { useSession } from 'next-auth/react';
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  getUserById,
  getAllPermissions,
  assignPermissions,
  changeUserPassword,
} from '@/app/(protected)/users/actions';
import type {
  CreateUserInput,
  UpdateUserInput,
} from '@/schemas/user-schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  UserPlus,
  MoreVertical,
  Pencil,
  Trash2,
  Shield,
  Key,
  Search,
  Loader2,
  Users,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import { UserRole } from '@prisma/client';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import PermissionsManager from './PermissionsManager';

// Tipos
type User = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    permissions: number;
  };
};

type Permission = {
  id: string;
  name: string;
  description: string | null;
  module: string;
  createdAt: Date;
};

type UserWithPermissions = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
  permissions: Array<{
    id: string;
    permission: Permission;
  }>;
};

// Mapeo de roles a español y colores
const ROLE_INFO: Record<UserRole, { label: string; color: string; icon: typeof ShieldCheck }> = {
  [UserRole.ADMIN]: { label: 'Administrador', color: 'bg-red-500', icon: ShieldAlert },
  [UserRole.SUPERVISOR]: { label: 'Supervisor', color: 'bg-orange-500', icon: ShieldCheck },
  [UserRole.WAREHOUSE_MANAGER]: { label: 'Jefe de Almacén', color: 'bg-blue-500', icon: Shield },
  [UserRole.OPERATOR]: { label: 'Operador', color: 'bg-green-500', icon: Users },
  [UserRole.VIEWER]: { label: 'Observador', color: 'bg-gray-500', icon: Users },
};

export default function UserManagementClient() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Modales
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithPermissions | null>(null);

  // Permisos
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);

  // Cargar datos iniciales
  useEffect(() => {
    loadUsers();
    loadPermissions();
  }, []);

  // Filtrar usuarios
  useEffect(() => {
    if (searchTerm) {
      const filtered = users.filter(
        (user) =>
          user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  }, [searchTerm, users]);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const data = await getUsers();
      setUsers(data as unknown as User[]);
    } catch (error) {
      toast.error('Error al cargar usuarios');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPermissions = async () => {
    try {
      const data = await getAllPermissions();
      setAllPermissions(data as unknown as Permission[]);
    } catch (error) {
      console.error('Error al cargar permisos:', error);
    }
  };

  const handleCreateUser = async (formData: FormData) => {
    startTransition(async () => {
      try {
        const input: CreateUserInput = {
          email: formData.get('email') as string,
          name: formData.get('name') as string,
          password: formData.get('password') as string,
          role: formData.get('role') as UserRole,
          image: null,
        };

        await createUser(input);
        toast.success('Usuario creado exitosamente');
        setIsCreateModalOpen(false);
        loadUsers();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Error al crear usuario');
      }
    });
  };

  const handleUpdateUser = async (formData: FormData) => {
    if (!selectedUser) return;

    startTransition(async () => {
      try {
        const input: UpdateUserInput = {
          id: selectedUser.id,
          email: formData.get('email') as string,
          name: formData.get('name') as string,
          role: formData.get('role') as UserRole,
          image: selectedUser.image,
        };

        await updateUser(input);
        toast.success('Usuario actualizado exitosamente');
        setIsEditModalOpen(false);
        setSelectedUser(null);
        loadUsers();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Error al actualizar usuario');
      }
    });
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar al usuario "${userName}"?`)) {
      return;
    }

    startTransition(async () => {
      try {
        await deleteUser(userId);
        toast.success('Usuario eliminado exitosamente');
        loadUsers();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Error al eliminar usuario');
      }
    });
  };

  const handleChangePassword = async (formData: FormData) => {
    if (!selectedUser) return;

    const newPassword = formData.get('newPassword') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (newPassword !== confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    startTransition(async () => {
      try {
        await changeUserPassword({
          userId: selectedUser.id,
          newPassword,
          confirmPassword,
        });
        toast.success('Contraseña actualizada exitosamente');
        setIsPasswordModalOpen(false);
        setSelectedUser(null);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Error al cambiar contraseña');
      }
    });
  };

  const openEditModal = async (userId: string) => {
    try {
      const user = await getUserById(userId);
      setSelectedUser(user as unknown as UserWithPermissions);
      setIsEditModalOpen(true);
    } catch {
      toast.error('Error al cargar datos del usuario');
    }
  };

  const openPermissionsModal = async (userId: string) => {
    try {
      const user = await getUserById(userId);
      setSelectedUser(user as unknown as UserWithPermissions);
      setUserPermissions(user.permissions.map((p) => p.permission.id));
      setIsPermissionsModalOpen(true);
    } catch {
      toast.error('Error al cargar permisos del usuario');
    }
  };

  const openPasswordModal = async (userId: string) => {
    try {
      const user = await getUserById(userId);
      setSelectedUser(user as unknown as UserWithPermissions);
      setIsPasswordModalOpen(true);
    } catch {
      toast.error('Error al cargar datos del usuario');
    }
  };

  const handleSavePermissions = async () => {
    if (!selectedUser) return;

    startTransition(async () => {
      try {
        await assignPermissions({
          userId: selectedUser.id,
          permissionIds: userPermissions,
        });
        toast.success('Permisos actualizados exitosamente');
        setIsPermissionsModalOpen(false);
        setSelectedUser(null);
        loadUsers();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Error al actualizar permisos');
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con búsqueda y crear */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Usuarios del Sistema</CardTitle>
              <CardDescription>
                {users.length} {users.length === 1 ? 'usuario' : 'usuarios'} registrados
              </CardDescription>
            </div>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Nuevo Usuario
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabla de usuarios */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Permisos</TableHead>
                <TableHead>Creado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No se encontraron usuarios
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => {
                  const roleInfo = ROLE_INFO[user.role];
                  const RoleIcon = roleInfo.icon;
                  const isCurrentUser = user.id === session?.user?.id;

                  return (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {user.name}
                          {isCurrentUser && (
                            <Badge variant="outline" className="text-xs">
                              Tú
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge className={roleInfo.color}>
                          <RoleIcon className="h-3 w-3 mr-1" />
                          {roleInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {user._count.permissions} permisos
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(user.createdAt), {
                          addSuffix: true,
                          locale: es,
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => openEditModal(user.id)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openPasswordModal(user.id)}>
                              <Key className="h-4 w-4 mr-2" />
                              Cambiar Contraseña
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openPermissionsModal(user.id)}>
                              <Shield className="h-4 w-4 mr-2" />
                              Gestionar Permisos
                            </DropdownMenuItem>
                            {!isCurrentUser && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleDeleteUser(user.id, user.name)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Eliminar
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal Crear Usuario */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Nuevo Usuario</DialogTitle>
            <DialogDescription>
              Completa los datos para crear un nuevo usuario del sistema
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleCreateUser(new FormData(e.currentTarget));
            }}
          >
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre Completo</Label>
                <Input id="name" name="name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input id="password" name="password" type="password" minLength={6} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Rol</Label>
                <Select name="role" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar rol" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ROLE_INFO).map(([role, info]) => (
                      <SelectItem key={role} value={role}>
                        {info.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateModalOpen(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Crear Usuario
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Editar Usuario */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
            <DialogDescription>
              Modifica los datos del usuario seleccionado
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleUpdateUser(new FormData(e.currentTarget));
              }}
            >
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Nombre Completo</Label>
                  <Input
                    id="edit-name"
                    name="name"
                    defaultValue={selectedUser.name}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    name="email"
                    type="email"
                    defaultValue={selectedUser.email}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-role">Rol</Label>
                  <Select name="role" defaultValue={selectedUser.role} required>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ROLE_INFO).map(([role, info]) => (
                        <SelectItem key={role} value={role}>
                          {info.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setSelectedUser(null);
                  }}
                  disabled={isPending}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Guardar Cambios
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Cambiar Contraseña */}
      <Dialog open={isPasswordModalOpen} onOpenChange={setIsPasswordModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar Contraseña</DialogTitle>
            <DialogDescription>
              {selectedUser && `Cambiar contraseña para ${selectedUser.name}`}
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleChangePassword(new FormData(e.currentTarget));
              }}
            >
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nueva Contraseña</Label>
                  <Input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    minLength={6}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    minLength={6}
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsPasswordModalOpen(false);
                    setSelectedUser(null);
                  }}
                  disabled={isPending}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Cambiar Contraseña
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Gestionar Permisos */}
      <Dialog open={isPermissionsModalOpen} onOpenChange={setIsPermissionsModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Gestionar Permisos</DialogTitle>
            <DialogDescription>
              {selectedUser && `Configurar permisos para ${selectedUser.name} (${ROLE_INFO[selectedUser.role].label})`}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden">
            <PermissionsManager
              allPermissions={allPermissions}
              selectedPermissions={userPermissions}
              onChange={setUserPermissions}
            />
          </div>

          <DialogFooter className="border-t pt-4 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsPermissionsModalOpen(false);
                setSelectedUser(null);
              }}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button onClick={handleSavePermissions} disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Guardar Permisos ({userPermissions.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
