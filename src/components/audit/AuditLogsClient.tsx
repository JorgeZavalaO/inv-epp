"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Clock, 
  User, 
  FileEdit, 
  Plus, 
  Trash2, 
  ChevronLeft, 
  ChevronRight,
  Search,
  Filter,
  BarChart3,
  Database,
  Calendar,
  X
} from "lucide-react";
import { formatDateLima } from "@/lib/formatDate";

interface AuditLog {
  id: string;
  userId: number;
  action: "CREATE" | "UPDATE" | "DELETE";
  entityType: string;
  entityId: number;
  changes: Record<string, unknown>;
  metadata: {
    ipAddress?: string;
    userAgent?: string;
    [key: string]: unknown;
  } | null;
  createdAt: string;
  expiresAt: string;
  user: {
    id: number;
    name: string | null;
    email: string | null;
  };
}

interface AuditStats {
  total: number;
  expired: number;
  active: number;
  recentActivity: number;
  storageEstimate: {
    totalMB: string;
    totalGB: string;
  };
  byEntityType: Array<{
    entityType: string;
    count: number;
    percentage: string;
  }>;
  byAction: Array<{
    action: string;
    count: number;
    percentage: string;
  }>;
}

interface Filters {
  entityType: string;
  entityId: string;
  userId: string;
  action: string;
  dateFrom: string;
  dateTo: string;
}

export default function AuditLogsClient() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showStats, setShowStats] = useState(true);
  const [filters, setFilters] = useState<Filters>({
    entityType: "",
    entityId: "",
    userId: "",
    action: "",
    dateFrom: "",
    dateTo: "",
  });

  const [activeFilters, setActiveFilters] = useState<Filters>(filters);

  // Cargar estadísticas
  useEffect(() => {
    fetchStats();
  }, []);

  // Cargar logs
  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, activeFilters]);

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/audit-logs/stats");
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      });

      if (activeFilters.entityType) params.append("entityType", activeFilters.entityType);
      if (activeFilters.entityId) params.append("entityId", activeFilters.entityId);
      if (activeFilters.userId) params.append("userId", activeFilters.userId);
      if (activeFilters.action) params.append("action", activeFilters.action);
      if (activeFilters.dateFrom) params.append("dateFrom", activeFilters.dateFrom);
      if (activeFilters.dateTo) params.append("dateTo", activeFilters.dateTo);

      const response = await fetch(`/api/audit-logs?${params}`);
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs);
        setTotalPages(data.pagination.totalPages);
        setTotal(data.pagination.total);
      }
    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    setActiveFilters(filters);
    setPage(1);
  };

  const clearFilters = () => {
    const emptyFilters = {
      entityType: "",
      entityId: "",
      userId: "",
      action: "",
      dateFrom: "",
      dateTo: "",
    };
    setFilters(emptyFilters);
    setActiveFilters(emptyFilters);
    setPage(1);
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case "CREATE":
        return <Plus className="h-4 w-4" />;
      case "UPDATE":
        return <FileEdit className="h-4 w-4" />;
      case "DELETE":
        return <Trash2 className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "CREATE":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "UPDATE":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "DELETE":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      default:
        return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  const formatChanges = (changes: Record<string, unknown>) => {
    return (
      <pre className="text-xs bg-muted p-2 rounded-md max-w-md overflow-x-auto">
        {JSON.stringify(changes, null, 2)}
      </pre>
    );
  };

  const hasActiveFilters = Object.values(activeFilters).some((v) => v !== "");

  return (
    <div className="space-y-6">
      {/* Estadísticas */}
      {showStats && stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Logs</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {stats.active.toLocaleString()} activos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Actividad Reciente</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.recentActivity}</div>
              <p className="text-xs text-muted-foreground">Últimas 24 horas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Almacenamiento</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.storageEstimate.totalMB} MB</div>
              <p className="text-xs text-muted-foreground">
                {stats.storageEstimate.totalGB} GB total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Por Expirar</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.expired.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {stats.expired > 0 ? "Pendientes limpieza" : "Todo limpio"}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtros */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filtros de Búsqueda
              </CardTitle>
              <CardDescription>Filtra los logs de auditoría por diferentes criterios</CardDescription>
            </div>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-2" />
                Limpiar Filtros
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de Entidad</label>
              <Select value={filters.entityType || "all"} onValueChange={(v) => setFilters({ ...filters, entityType: v === "all" ? "" : v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas las entidades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="DeliveryBatch">Lotes de Entrega</SelectItem>
                  <SelectItem value="Delivery">Entregas</SelectItem>
                  <SelectItem value="ReturnBatch">Lotes de Devolución</SelectItem>
                  <SelectItem value="ReturnItem">Devoluciones</SelectItem>
                  <SelectItem value="StockMovement">Movimientos</SelectItem>
                  <SelectItem value="EPPStock">Stock EPP</SelectItem>
                  <SelectItem value="EPP">EPPs</SelectItem>
                  <SelectItem value="Collaborator">Colaboradores</SelectItem>
                  <SelectItem value="Warehouse">Almacenes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Acción</label>
              <Select value={filters.action || "all"} onValueChange={(v) => setFilters({ ...filters, action: v === "all" ? "" : v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas las acciones" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="CREATE">Crear</SelectItem>
                  <SelectItem value="UPDATE">Actualizar</SelectItem>
                  <SelectItem value="DELETE">Eliminar</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">ID de Entidad</label>
              <Input
                type="number"
                placeholder="Ej: 123"
                value={filters.entityId}
                onChange={(e) => setFilters({ ...filters, entityId: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">ID de Usuario</label>
              <Input
                type="number"
                placeholder="Ej: 5"
                value={filters.userId}
                onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Fecha Desde</label>
              <Input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Fecha Hasta</label>
              <Input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button onClick={applyFilters}>
              <Search className="h-4 w-4 mr-2" />
              Buscar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Logs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Historial de Auditoría</CardTitle>
              <CardDescription>
                Mostrando {logs.length} de {total.toLocaleString()} registros
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowStats(!showStats)}>
              <BarChart3 className="h-4 w-4 mr-2" />
              {showStats ? "Ocultar" : "Mostrar"} Estadísticas
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No se encontraron registros de auditoría</p>
              {hasActiveFilters && (
                <Button variant="link" onClick={clearFilters} className="mt-2">
                  Limpiar filtros
                </Button>
              )}
            </div>
          ) : (
            <>
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha/Hora</TableHead>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Acción</TableHead>
                      <TableHead>Entidad</TableHead>
                      <TableHead>ID</TableHead>
                      <TableHead>Cambios</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-mono text-xs whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            {formatDateLima(log.createdAt)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-3 w-3 text-muted-foreground" />
                            <div className="text-sm">
                              <div className="font-medium">{log.user.name || "Sin nombre"}</div>
                              <div className="text-xs text-muted-foreground">{log.user.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getActionColor(log.action)}>
                            <span className="flex items-center gap-1">
                              {getActionIcon(log.action)}
                              {log.action}
                            </span>
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{log.entityType}</TableCell>
                        <TableCell className="font-mono text-sm">{log.entityId}</TableCell>
                        <TableCell>{formatChanges(log.changes)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>

              {/* Paginación */}
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Página {page} de {totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1 || loading}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={page >= totalPages || loading}
                  >
                    Siguiente
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
