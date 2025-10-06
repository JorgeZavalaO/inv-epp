"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Activity, Database, MemoryStick, Clock } from "lucide-react";

interface SystemHealth {
  loggerStats?: {
    queueSize: number;
    isProcessing: boolean;
    rateLimitedUsers: number;
    lastFlush: number;
    config: {
      BATCH_SIZE: number;
      BATCH_TIMEOUT: number;
      MAX_QUEUE_SIZE: number;
      RATE_LIMIT: number;
    };
  };
  database?: {
    totalAuditLogs: number;
    recentLogs24h: number;
  };
  memory?: {
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
  timestamp?: string;
  error?: string;
}

interface QuickCheck {
  status: 'good' | 'warning' | 'critical';
  message: string;
}

export default function PerformanceMonitorClient() {
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [quickCheck, setQuickCheck] = useState<QuickCheck | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchSystemHealth = async () => {
    try {
      setIsLoading(true);
      
      const [healthResponse, checkResponse] = await Promise.all([
        fetch('/api/performance/audit'),
        fetch('/api/performance/quick-check')
      ]);

      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        setSystemHealth(healthData);
      }

      if (checkResponse.ok) {
        const checkData = await checkResponse.json();
        setQuickCheck(checkData);
      }

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching system health:', error);
      setSystemHealth({ error: 'No se pudo conectar con el sistema de monitoreo' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSystemHealth();
    
    // Actualizar cada 30 segundos
    const interval = setInterval(fetchSystemHealth, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const formatBytes = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'bg-green-100 text-green-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'good': return '✅';
      case 'warning': return '⚠️';
      case 'critical': return '🚨';
      default: return '❓';
    }
  };

  if (isLoading && !systemHealth) {
    return (
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
    );
  }

  return (
    <div className="space-y-6">
      {/* Estado General */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {quickCheck && (
            <Badge className={getStatusColor(quickCheck.status)}>
              {getStatusIcon(quickCheck.status)} {quickCheck.message}
            </Badge>
          )}
          {lastUpdated && (
            <span className="text-sm text-muted-foreground">
              Última actualización: {lastUpdated.toLocaleTimeString('es-ES')}
            </span>
          )}
        </div>
        <Button 
          onClick={fetchSystemHealth} 
          disabled={isLoading}
          size="sm"
          variant="outline"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* Métricas Principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Cola de Auditoría */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cola de Auditoría</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {systemHealth?.loggerStats?.queueSize ?? 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              logs en cola
            </p>
            {systemHealth?.loggerStats?.isProcessing && (
              <Badge variant="secondary" className="mt-1">
                Procesando
              </Badge>
            )}
          </CardContent>
        </Card>

        {/* Memoria */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uso de Memoria</CardTitle>
            <MemoryStick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {systemHealth?.memory ? formatBytes(systemHealth.memory.heapUsed) : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              de {systemHealth?.memory ? formatBytes(systemHealth.memory.heapTotal) : 'N/A'} total
            </p>
          </CardContent>
        </Card>

        {/* Base de Datos */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Logs de Auditoría</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {systemHealth?.database?.totalAuditLogs?.toLocaleString('es-ES') ?? 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              {systemHealth?.database?.recentLogs24h ?? 'N/A'} últimas 24h
            </p>
          </CardContent>
        </Card>

        {/* Rate Limiting */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuarios Limitados</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {systemHealth?.loggerStats?.rateLimitedUsers ?? 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              usuarios activos con límite
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Configuración del Logger */}
      {systemHealth?.loggerStats?.config && (
        <Card>
          <CardHeader>
            <CardTitle>Configuración del Logger</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1">
                <div className="text-sm font-medium">Tamaño de Lote</div>
                <div className="text-lg font-bold">{systemHealth.loggerStats.config.BATCH_SIZE}</div>
              </div>
              
              <div className="space-y-1">
                <div className="text-sm font-medium">Timeout (ms)</div>
                <div className="text-lg font-bold">{systemHealth.loggerStats.config.BATCH_TIMEOUT}</div>
              </div>
              
              <div className="space-y-1">
                <div className="text-sm font-medium">Cola Máxima</div>
                <div className="text-lg font-bold">{systemHealth.loggerStats.config.MAX_QUEUE_SIZE}</div>
              </div>
              
              <div className="space-y-1">
                <div className="text-sm font-medium">Rate Limit</div>
                <div className="text-lg font-bold">{systemHealth.loggerStats.config.RATE_LIMIT}/min</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {systemHealth?.error && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600">Error del Sistema</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">{systemHealth.error}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}