"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  CheckSquare,
  Square,
  MinusSquare,
  AlertCircle,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

type Permission = {
  id: string;
  name: string;
  description: string | null;
  module: string;
};

type PermissionsManagerProps = {
  allPermissions: Permission[];
  selectedPermissions: string[];
  onChange: (permissionIds: string[]) => void;
  readOnly?: boolean;
};

// Mapeo de nombres de módulos a español
const MODULE_NAMES: Record<string, string> = {
  users: 'Usuarios',
  deliveries: 'Entregas',
  warehouses: 'Almacenes',
  epps: 'EPPs',
  stock: 'Movimientos de Stock',
  returns: 'Devoluciones',
  collaborators: 'Colaboradores',
  settings: 'Configuración',
  audit: 'Auditoría',
  reports: 'Reportes',
  requests: 'Solicitudes',
};

// Emojis por módulo
const MODULE_ICONS: Record<string, string> = {
  users: '👥',
  deliveries: '📦',
  warehouses: '🏭',
  epps: '🦺',
  stock: '📊',
  returns: '↩️',
  collaborators: '👷',
  settings: '⚙️',
  audit: '🔍',
  reports: '📄',
  requests: '📝',
};

export default function PermissionsManager({
  allPermissions,
  selectedPermissions,
  onChange,
  readOnly = false,
}: PermissionsManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');

  // Agrupar permisos por módulo
  const permissionsByModule = allPermissions.reduce((acc, permission) => {
    if (!acc[permission.module]) {
      acc[permission.module] = [];
    }
    acc[permission.module].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  // Filtrar permisos por búsqueda
  const filteredModules = Object.entries(permissionsByModule).reduce((acc, [module, permissions]) => {
    if (!searchTerm) {
      acc[module] = permissions;
    } else {
      const filtered = permissions.filter(
        (p) =>
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          module.toLowerCase().includes(searchTerm.toLowerCase())
      );
      if (filtered.length > 0) {
        acc[module] = filtered;
      }
    }
    return acc;
  }, {} as Record<string, Permission[]>);

  const togglePermission = (permissionId: string) => {
    if (readOnly) return;

    if (selectedPermissions.includes(permissionId)) {
      onChange(selectedPermissions.filter((id) => id !== permissionId));
    } else {
      onChange([...selectedPermissions, permissionId]);
    }
  };

  const toggleModulePermissions = (permissions: Permission[]) => {
    if (readOnly) return;

    const modulePermissionIds = permissions.map((p) => p.id);
    const allSelected = modulePermissionIds.every((id) => selectedPermissions.includes(id));

    if (allSelected) {
      onChange(selectedPermissions.filter((id) => !modulePermissionIds.includes(id)));
    } else {
      const newPermissions = [...selectedPermissions];
      modulePermissionIds.forEach((id) => {
        if (!newPermissions.includes(id)) {
          newPermissions.push(id);
        }
      });
      onChange(newPermissions);
    }
  };

  const selectAll = () => {
    if (readOnly) return;
    onChange(allPermissions.map((p) => p.id));
  };

  const clearAll = () => {
    if (readOnly) return;
    onChange([]);
  };

  const getModuleStatus = (permissions: Permission[]) => {
    const modulePermissionIds = permissions.map((p) => p.id);
    const selectedCount = modulePermissionIds.filter((id) => selectedPermissions.includes(id)).length;

    if (selectedCount === 0) return 'none';
    if (selectedCount === modulePermissionIds.length) return 'all';
    return 'some';
  };

  return (
    <div className="space-y-4">
      {/* Controles superiores */}
      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={selectAll}
            disabled={readOnly}
          >
            <CheckSquare className="h-4 w-4 mr-1" />
            Seleccionar Todos
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={clearAll}
            disabled={readOnly}
          >
            <Square className="h-4 w-4 mr-1" />
            Limpiar Todos
          </Button>
        </div>
        <Badge variant="secondary" className="text-xs">
          {selectedPermissions.length} de {allPermissions.length} seleccionados
        </Badge>
      </div>

      {/* Búsqueda */}
      <input
        type="text"
        placeholder="Buscar permisos..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full px-3 py-2 text-sm border rounded-md"
      />

      {/* Alerta informativa */}
      {!readOnly && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Los permisos permiten controlar qué acciones puede realizar este usuario en el sistema.
            Selecciona módulos completos o permisos individuales según sea necesario.
          </AlertDescription>
        </Alert>
      )}

      {/* Lista de módulos y permisos */}
      <ScrollArea className="h-[400px] pr-4">
        <div className="space-y-3">
          {Object.entries(filteredModules).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No se encontraron permisos que coincidan con &quot;{searchTerm}&quot;
            </div>
          ) : (
            Object.entries(filteredModules).map(([module, permissions]) => {
              const status = getModuleStatus(permissions);
              const ModuleIcon =
                status === 'all' ? CheckSquare : status === 'some' ? MinusSquare : Square;

              return (
                <Card key={module} className="overflow-hidden">
                  <CardHeader className="pb-3 bg-muted/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{MODULE_ICONS[module] || '📋'}</span>
                        <div>
                          <CardTitle className="text-sm font-semibold">
                            {MODULE_NAMES[module] || module}
                          </CardTitle>
                          <CardDescription className="text-xs">
                            {permissions.length} {permissions.length === 1 ? 'permiso' : 'permisos'}
                          </CardDescription>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleModulePermissions(permissions)}
                        disabled={readOnly}
                        className="h-8 gap-1 text-xs"
                      >
                        <ModuleIcon className="h-4 w-4" />
                        {status === 'all' ? 'Deseleccionar' : 'Seleccionar'}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-3">
                    <div className="space-y-2">
                      {permissions.map((permission) => (
                        <div
                          key={permission.id}
                          className="flex items-start space-x-3 p-2 rounded-md hover:bg-accent/50 transition-colors"
                        >
                          <Checkbox
                            id={permission.id}
                            checked={selectedPermissions.includes(permission.id)}
                            onCheckedChange={() => togglePermission(permission.id)}
                            disabled={readOnly}
                            className="mt-0.5"
                          />
                          <div className="flex-1 space-y-0.5">
                            <Label
                              htmlFor={permission.id}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                            >
                              {permission.name}
                            </Label>
                            {permission.description && (
                              <p className="text-xs text-muted-foreground">
                                {permission.description}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
