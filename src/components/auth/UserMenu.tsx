"use client";

import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, Settings, User, Shield } from 'lucide-react';
import { UserRole } from '@prisma/client';

// Mapeo de roles a etiquetas en español
const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Administrador',
  SUPERVISOR: 'Supervisor',
  WAREHOUSE_MANAGER: 'Gerente de Almacén',
  OPERATOR: 'Operador',
  VIEWER: 'Visualizador',
};

// Mapeo de roles a colores de badge
const ROLE_COLORS: Record<UserRole, string> = {
  ADMIN: 'bg-red-100 text-red-800 border-red-300',
  SUPERVISOR: 'bg-orange-100 text-orange-800 border-orange-300',
  WAREHOUSE_MANAGER: 'bg-blue-100 text-blue-800 border-blue-300',
  OPERATOR: 'bg-green-100 text-green-800 border-green-300',
  VIEWER: 'bg-gray-100 text-gray-800 border-gray-300',
};

export function UserMenu() {
  const { data: session } = useSession();
  const router = useRouter();

  if (!session?.user) {
    return null;
  }

  const initials = session.user.name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '??';

  // Obtener etiqueta y color del rol
  const roleLabel = ROLE_LABELS[session.user.role] || session.user.role;
  const roleColor = ROLE_COLORS[session.user.role] || 'bg-gray-100 text-gray-800 border-gray-300';

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push('/auth/signin');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="outline-none">
        <div className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity">
          <Avatar className="h-8 w-8">
            <AvatarImage src={session.user.image || undefined} alt={session.user.name || 'Usuario'} />
            <AvatarFallback className="bg-blue-600 text-white text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col items-start text-sm">
            <span className="font-medium text-slate-900">{session.user.name || 'Usuario'}</span>
            <span className="text-xs text-slate-500">{roleLabel}</span>
          </div>
        </div>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-2">
            <p className="text-sm font-medium leading-none">{session.user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {session.user.email}
            </p>
            <div className="flex items-center gap-2">
              <Shield className="h-3 w-3 text-slate-500" />
              <Badge variant="outline" className={`text-xs ${roleColor}`}>
                {roleLabel}
              </Badge>
            </div>
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={() => router.push('/profile')}>
          <User className="mr-2 h-4 w-4" />
          <span>Mi Perfil</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => router.push('/settings')}>
          <Settings className="mr-2 h-4 w-4" />
          <span>Configuración</span>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Cerrar Sesión</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}