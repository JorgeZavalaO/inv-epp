"use client";

import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SessionDebugger() {
  const { data: session, status } = useSession();

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
          <strong>Cookies:</strong>
          <div className="max-h-20 overflow-auto text-xs text-muted-foreground">
            {typeof document !== 'undefined' ? document.cookie : 'No disponible en SSR'}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}