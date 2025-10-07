"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SessionDebugger() {
  const { data: session, status } = useSession();
  const [cookies, setCookies] = useState<string>('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setCookies(document.cookie || '');
  }, []);

  // No renderizar nada en el servidor para evitar hidratación
  if (!mounted) {
    return null;
  }

  const authCookies = cookies
    .split(';')
    .filter(cookie => cookie.includes('authjs') || cookie.includes('next-auth'))
    .map(cookie => cookie.trim());

  const clerkCookies = cookies
    .split(';')
    .filter(cookie => cookie.includes('clerk'))
    .map(cookie => cookie.trim());

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-sm">Estado de Sesión</CardTitle>
        <CardDescription>Debug de autenticación</CardDescription>
      </CardHeader>
      <CardContent className="text-xs space-y-2">
        <div>
          <strong>Status:</strong> <span className={status === 'authenticated' ? 'text-green-600' : 'text-red-600'}>{status}</span>
        </div>
        {session && (
          <div className="space-y-1">
            <div><strong>ID:</strong> {session.user?.id}</div>
            <div><strong>Email:</strong> {session.user?.email}</div>
            <div><strong>Nombre:</strong> {session.user?.name}</div>
            <div><strong>Rol:</strong> {session.user?.role}</div>
          </div>
        )}
        <div className="pt-2 border-t">
          <strong>Cookies Auth.js:</strong>
          <div className="max-h-20 overflow-auto text-xs text-muted-foreground">
            {authCookies.length > 0 ? authCookies.join('\n') : 'No hay cookies de Auth.js'}
          </div>
        </div>
        {clerkCookies.length > 0 && (
          <div className="pt-2 border-t border-red-200">
            <strong className="text-red-600">⚠️ Cookies de Clerk detectadas:</strong>
            <div className="max-h-16 overflow-auto text-xs text-red-500">
              {clerkCookies.join('\n')}
            </div>
            <button 
              onClick={() => {
                // Limpiar cookies de Clerk
                clerkCookies.forEach(cookie => {
                  const name = cookie.split('=')[0].trim();
                  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
                  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${window.location.hostname}`;
                });
                setTimeout(() => window.location.reload(), 100);
              }}
              className="mt-1 px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200"
            >
              Limpiar cookies Clerk
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}