import { Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Activity, Database, Clock, AlertTriangle, CheckCircle } from "lucide-react";
import PerformanceMonitorClient from '@/components/performance/PerformanceMonitorClient';

export default function PerformanceMonitorPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Monitor de Performance</h1>
          <p className="text-muted-foreground">
            Monitoreo en tiempo real del sistema de auditoría y performance general
          </p>
        </div>
      </div>

      <Suspense fallback={
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cargando...</CardTitle>
                <div className="h-4 w-4 bg-muted rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded mb-2" />
                <div className="h-4 bg-muted rounded w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      }>
        <PerformanceMonitorClient />
      </Suspense>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Estado del Sistema
            </CardTitle>
            <CardDescription>
              Información general sobre el estado de salud del sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Sistema de Auditoría</span>
              <Badge variant="default" className="bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                Activo
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Logger Optimizado</span>
              <Badge variant="default" className="bg-blue-100 text-blue-800">
                <Activity className="h-3 w-3 mr-1" />
                Habilitado
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Batching</span>
              <Badge variant="default" className="bg-purple-100 text-purple-800">
                <Clock className="h-3 w-3 mr-1" />
                Activo
              </Badge>
            </div>
            <Separator />
            <div className="text-xs text-muted-foreground">
              Última actualización: {new Date().toLocaleString('es-ES')}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Recomendaciones
            </CardTitle>
            <CardDescription>
              Sugerencias para optimizar el rendimiento
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <div className="text-sm">
                  <div className="font-medium">Logger optimizado activo</div>
                  <div className="text-muted-foreground">
                    El sistema está utilizando el logger con batching para mejor performance
                  </div>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <div className="text-sm">
                  <div className="font-medium">Limpieza automática configurada</div>
                  <div className="text-muted-foreground">
                    Los logs antiguos se eliminan automáticamente después de 30 días
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 text-blue-500 mt-0.5" />
                <div className="text-sm">
                  <div className="font-medium">Monitorear uso de memoria</div>
                  <div className="text-muted-foreground">
                    Revisar regularmente el uso de memoria durante picos de actividad
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Configuración del Logger Optimizado
          </CardTitle>
          <CardDescription>
            Parámetros de configuración del sistema de auditoría optimizado
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <div className="text-sm font-medium">Tamaño de Lote</div>
              <div className="text-2xl font-bold">10</div>
              <div className="text-xs text-muted-foreground">logs por lote</div>
            </div>
            
            <div className="space-y-1">
              <div className="text-sm font-medium">Timeout de Lote</div>
              <div className="text-2xl font-bold">5s</div>
              <div className="text-xs text-muted-foreground">tiempo máximo</div>
            </div>
            
            <div className="space-y-1">
              <div className="text-sm font-medium">Límite de Cola</div>
              <div className="text-2xl font-bold">100</div>
              <div className="text-xs text-muted-foreground">logs máximos</div>
            </div>
            
            <div className="space-y-1">
              <div className="text-sm font-medium">Rate Limit</div>
              <div className="text-2xl font-bold">50</div>
              <div className="text-xs text-muted-foreground">logs/min/usuario</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}