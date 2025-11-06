import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { ProfileForm } from '@/components/profile/ProfileForm';
import { PasswordForm } from '@/components/profile/PasswordForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { User, Shield, Calendar, Mail, Clock } from 'lucide-react';
import { formatDateLima } from '@/lib/formatDate';

export const metadata = {
  title: 'Mi Perfil | EPP Manager',
  description: 'Gestiona tu información personal y configuración de cuenta',
};

export default async function ProfilePage() {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/auth/signin');
  }

  // Obtener datos completos del usuario
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      lastLoginAt: true,
      emailVerified: true,
      _count: {
        select: {
          stockMovements: true,
          deliveryBatches: true,
          returnBatches: true,
          auditLogs: true,
        },
      },
    },
  });

  if (!user) {
    redirect('/auth/signin');
  }

  const initials = user.name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '??';

  const roleLabels: Record<string, string> = {
    ADMIN: 'Administrador',
    SUPERVISOR: 'Supervisor',
    WAREHOUSE_MANAGER: 'Gerente de Almacén',
    OPERATOR: 'Operador',
    VIEWER: 'Visualizador',
  };

  const roleBadgeColors: Record<string, string> = {
    ADMIN: 'bg-red-100 text-red-800 border-red-300',
    SUPERVISOR: 'bg-orange-100 text-orange-800 border-orange-300',
    WAREHOUSE_MANAGER: 'bg-blue-100 text-blue-800 border-blue-300',
    OPERATOR: 'bg-green-100 text-green-800 border-green-300',
    VIEWER: 'bg-gray-100 text-gray-800 border-gray-300',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Mi Perfil</h1>
        <p className="text-sm text-slate-600 mt-1">
          Gestiona tu información personal y configuración de cuenta
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna izquierda - Info del usuario */}
        <div className="lg:col-span-1 space-y-6">
          {/* Card de información básica */}
          <Card>
            <CardHeader className="text-center pb-4">
              <div className="flex justify-center mb-4">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={user.image || undefined} alt={user.name || 'Usuario'} />
                  <AvatarFallback className="bg-blue-600 text-white text-2xl">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </div>
              <CardTitle className="text-xl">{user.name}</CardTitle>
              <CardDescription>{user.email}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Separator />
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-sm text-slate-600">
                    <Shield className="h-4 w-4 mr-2" />
                    <span>Rol</span>
                  </div>
                  <Badge variant="outline" className={roleBadgeColors[user.role]}>
                    {roleLabels[user.role]}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center text-sm text-slate-600">
                    <User className="h-4 w-4 mr-2" />
                    <span>Estado</span>
                  </div>
                  <Badge variant={user.isActive ? "default" : "secondary"}>
                    {user.isActive ? 'Activo' : 'Inactivo'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center text-sm text-slate-600">
                    <Mail className="h-4 w-4 mr-2" />
                    <span>Email verificado</span>
                  </div>
                  <Badge variant={user.emailVerified ? "default" : "secondary"}>
                    {user.emailVerified ? 'Sí' : 'No'}
                  </Badge>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center text-xs text-slate-600">
                  <Calendar className="h-3 w-3 mr-2" />
                  <span>Miembro desde {formatDateLima(user.createdAt.toISOString())}</span>
                </div>
                
                {user.lastLoginAt && (
                  <div className="flex items-center text-xs text-slate-600">
                    <Clock className="h-3 w-3 mr-2" />
                    <span>Último acceso: {formatDateLima(user.lastLoginAt.toISOString())}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Card de estadísticas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Actividad</CardTitle>
              <CardDescription>Resumen de tu actividad en el sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Movimientos de stock</span>
                  <span className="font-semibold">{user._count.stockMovements}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Lotes de entrega</span>
                  <span className="font-semibold">{user._count.deliveryBatches}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Lotes de devolución</span>
                  <span className="font-semibold">{user._count.returnBatches}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Acciones registradas</span>
                  <span className="font-semibold">{user._count.auditLogs}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Columna derecha - Formularios */}
        <div className="lg:col-span-2 space-y-6">
          {/* Información personal */}
          <Card>
            <CardHeader>
              <CardTitle>Información Personal</CardTitle>
              <CardDescription>
                Actualiza tu nombre, email e imagen de perfil
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProfileForm user={user} />
            </CardContent>
          </Card>

          {/* Cambiar contraseña */}
          <Card>
            <CardHeader>
              <CardTitle>Seguridad</CardTitle>
              <CardDescription>
                Cambia tu contraseña para mantener tu cuenta segura
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PasswordForm />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
