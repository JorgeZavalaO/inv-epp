"use client";

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

/**
 * Hook que actualiza la sesión periódicamente para reflejar cambios en roles/permisos
 * Se ejecuta cada 5 minutos en el cliente
 */
export function useSessionRefresh(intervalMinutes = 5) {
  const { data: session, update } = useSession();

  useEffect(() => {
    if (!session?.user) return;

    // Actualizar inmediatamente al montar
    update();

    // Configurar intervalo para actualizaciones periódicas
    const interval = setInterval(() => {
      console.log('Actualizando sesión...');
      update();
    }, intervalMinutes * 60 * 1000);

    return () => clearInterval(interval);
  }, [session?.user, update, intervalMinutes]);
}

/**
 * Hook que detecta cuando el rol del usuario cambió y muestra una notificación
 */
export function useRoleChangeDetector() {
  const { data: session } = useSession();

  useEffect(() => {
    if (!session?.user) return;

    // Guardar el rol actual en localStorage
    const storageKey = `user-role-${session.user.id}`;
    const previousRole = localStorage.getItem(storageKey);
    const currentRole = session.user.role;

    // Si hay un rol anterior y es diferente al actual
    if (previousRole && previousRole !== currentRole) {
      toast.warning(
        'Tu rol ha sido modificado. Por favor, recarga la página para aplicar los cambios.',
        {
          duration: 10000,
          action: {
            label: 'Recargar',
            onClick: () => window.location.reload(),
          },
        }
      );
    }

    // Actualizar el rol en localStorage
    localStorage.setItem(storageKey, currentRole);
  }, [session?.user]);
}
