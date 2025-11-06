"use client";

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

/**
 * Componente que monitorea cambios en la sesión del usuario
 * y actualiza automáticamente cuando hay cambios en rol/permisos
 */
export function SessionMonitor() {
  const { data: session, update, status } = useSession();
  const router = useRouter();

  // Actualizar sesión periódicamente (cada 5 minutos)
  useEffect(() => {
    if (status !== 'authenticated') return;

    const interval = setInterval(() => {
      console.log('[SessionMonitor] Actualizando sesión...');
      update();
    }, 5 * 60 * 1000); // 5 minutos

    return () => clearInterval(interval);
  }, [status, update]);

  // Detectar cambios en el rol del usuario
  useEffect(() => {
    if (!session?.user) return;

    const storageKey = `user-role-${session.user.id}`;
    const previousRole = localStorage.getItem(storageKey);
    const currentRole = session.user.role;

    // Si hay un rol anterior y es diferente al actual
    if (previousRole && previousRole !== currentRole) {
      console.log(`[SessionMonitor] Rol cambiado: ${previousRole} -> ${currentRole}`);
      
      toast.info(
        'Tu rol ha sido actualizado. Recargando la página...',
        {
          duration: 3000,
        }
      );

      // Actualizar localStorage
      localStorage.setItem(storageKey, currentRole);

      // Recargar la página después de 2 segundos para aplicar cambios
      setTimeout(() => {
        router.refresh();
        window.location.reload();
      }, 2000);
    } else if (previousRole === null) {
      // Primera vez que se carga, solo guardar
      localStorage.setItem(storageKey, currentRole);
    }
  }, [session?.user, router]);

  return null; // Este componente no renderiza nada
}
