import { Suspense } from 'react';
import { hasPermission } from '@/lib/auth-utils';
import { redirect } from 'next/navigation';
import UserManagementClient from '@/components/users/UserManagementClient';
import { Loader2 } from 'lucide-react';

export const metadata = {
  title: 'Gestión de Usuarios | EPP Manager',
  description: 'Administrar usuarios del sistema, roles y permisos',
};

export default async function UsersPage() {
  // Verificar permisos
  const canView = await hasPermission('user_view');
  
  if (!canView) {
    redirect('/dashboard');
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Usuarios</h1>
          <p className="text-muted-foreground mt-2">
            Administrar usuarios del sistema, asignar roles y permisos
          </p>
        </div>
      </div>

      <Suspense fallback={
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }>
        <UserManagementClient />
      </Suspense>
    </div>
  );
}
