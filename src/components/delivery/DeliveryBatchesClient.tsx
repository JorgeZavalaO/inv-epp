"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import DeliveryBatchTable from "./DeliveryBatchTable";
import DeliveryFilters from "./DeliveryFilters";
import DeliveryEmptyState from "./DeliveryEmptyState";
import SmartPagination from "./SmartPagination";
import PageSizeSelector from "./PageSizeSelector";
import DeliveryStats from "./DeliveryStats";
import ModalCreateDeliveryBatch from "./ModalCreateDeliveryBatch";
import ModalEditDeliveryBatch from "./ModalEditDeliveryBatch";
import ModalDeleteDeliveryBatch from "./ModalDeleteDeliveryBatch";
import ModalCancelDeliveryBatch from "./ModalCancelDeliveryBatch";
import { ExportAllDeliveriesButton } from "./ExportAllDeliveriesButton";
import { Loader2 } from "lucide-react";
import type { DeliveryBatchValues } from "@/schemas/delivery-batch-schema";

export interface BatchRow {
  id: number;
  code: string;
  date: string;
  documentId?: string | null;
  collaborator: string;
  operator: string;
  warehouse: string;
  items: number;
  isCancelled: boolean;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
}

// Lightweight batch row from list endpoint
interface DeliveryBatchListItem {
  id: number;
  code: string;
  createdAt: string;
  collaboratorId: number;
  warehouseId: number;
  note?: string | null;
  isCancelled: boolean;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  collaborator: { name: string; documentId: string | null };
  user: { name: string | null; email: string };
  warehouse: { name: string };
  _count: { deliveries: number };
}

// Detailed batch from /api/delivery-batches/[id]
interface DeliveryBatchDetail extends DeliveryBatchListItem {
  deliveries: { eppId: number; quantity: number }[];
}

interface FilterOption {
  id: number;
  name: string;
}

interface DeliveryStats {
  totalDeliveries: number;
  totalItems: number;
  uniqueCollaborators: number;
  thisMonthDeliveries: number;
}

interface FilterOptions {
  collaborators: FilterOption[];
  warehouses: FilterOption[];
  locations?: FilterOption[];
}

interface PaginationInfo {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface ApiResponse {
  batches: DeliveryBatchListItem[];
  pagination: PaginationInfo;
}

interface SearchParams {
  page?: string;
  limit?: string;
  search?: string;
  collaboratorId?: string;
  warehouseId?: string;
  location?: string;
  dateFrom?: string;
  dateTo?: string;
}

interface Props {
  searchParams: SearchParams;
}

export default function DeliveryBatchesClient({ searchParams }: Props) {
  const [data, setData] = useState<DeliveryBatchListItem[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({ collaborators: [], warehouses: [] });
  const [locations, setLocations] = useState<FilterOption[]>([]);
  const [stats, setStats] = useState<DeliveryStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingItem, setEditingItem] = useState<DeliveryBatchDetail | null>(null);
  const [deleting, setDeleting] = useState<DeliveryBatchListItem | null>(null);
  const [cancelling, setCancelling] = useState<DeliveryBatchListItem | null>(null);
  
  const router = useRouter();
  const urlSearchParams = useSearchParams();

  // Valores actuales de los filtros desde URL
  const currentPage = searchParams.page || "1";
  const currentLimit = searchParams.limit || "10";
  const currentSearch = searchParams.search || "";
  const currentCollaboratorId = searchParams.collaboratorId || "";
  const currentWarehouseId = searchParams.warehouseId || "";
  const currentLocation = searchParams.location || "";
  const currentDateFrom = searchParams.dateFrom || "";
  const currentDateTo = searchParams.dateTo || "";

  // Función para actualizar URL con nuevos parámetros
  const updateSearchParams = useCallback((newParams: Partial<SearchParams>) => {
    const params = new URLSearchParams(urlSearchParams.toString());
    
    Object.entries(newParams).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });

    // Resetear página si cambian los filtros (excepto cuando se cambia solo la página)
    if (!newParams.page && Object.keys(newParams).length > 0) {
      params.delete('page');
    }

    router.push(`/deliveries?${params.toString()}`);
  }, [router, urlSearchParams]);

  // Cargar datos cuando cambien los parámetros
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage,
        limit: currentLimit,
        ...(currentSearch && { search: currentSearch }),
        ...(currentCollaboratorId && { collaboratorId: currentCollaboratorId }),
    ...(currentWarehouseId && { warehouseId: currentWarehouseId }),
    ...(currentLocation && { location: currentLocation }),
        ...(currentDateFrom && { dateFrom: currentDateFrom }),
        ...(currentDateTo && { dateTo: currentDateTo }),
      });

      const response = await fetch(`/api/deliveries?${params.toString()}`);
      if (!response.ok) throw new Error('Error al cargar datos');
      
      const result: ApiResponse = await response.json();
      setData(result.batches);
      setPagination(result.pagination);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, currentLimit, currentSearch, currentCollaboratorId, currentWarehouseId, currentLocation, currentDateFrom, currentDateTo]);


  // Cargar opciones de filtros
  const fetchFilterOptions = useCallback(async () => {
    try {
      const response = await fetch('/api/deliveries/filters');
      if (!response.ok) throw new Error('Error al cargar opciones de filtros');
      
  const options: FilterOptions & { locations?: FilterOption[] } = await response.json();
  setFilterOptions({ collaborators: options.collaborators, warehouses: options.warehouses });
  setLocations(options.locations ?? []);
    } catch (error) {
      console.error('Error:', error);
    }
  }, []);

  // Cargar estadísticas
  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/deliveries/stats');
      if (!response.ok) throw new Error('Error al cargar estadísticas');
      
      const statsData: DeliveryStats = await response.json();
      setStats(statsData);
    } catch (error) {
      console.error('Error:', error);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchFilterOptions();
    fetchStats();
  }, [fetchFilterOptions, fetchStats]);

  // Handlers para filtros
  const handleSearchChange = useCallback((value: string) => {
    updateSearchParams({ search: value });
  }, [updateSearchParams]);

  const handleCollaboratorChange = useCallback((value: string) => {
    updateSearchParams({ collaboratorId: value });
  }, [updateSearchParams]);

  const handleWarehouseChange = useCallback((value: string) => {
    updateSearchParams({ warehouseId: value });
  }, [updateSearchParams]);

  const handleLocationChange = useCallback((value: string) => {
    updateSearchParams({ location: value });
  }, [updateSearchParams]);

  const handleDateFromChange = useCallback((value: string) => {
    updateSearchParams({ dateFrom: value });
  }, [updateSearchParams]);

  const handleDateToChange = useCallback((value: string) => {
    updateSearchParams({ dateTo: value });
  }, [updateSearchParams]);

  const handleClearFilters = useCallback(() => {
    router.push('/deliveries');
  }, [router]);

  const handlePageChange = useCallback((page: number) => {
    updateSearchParams({ page: page.toString() });
  }, [updateSearchParams]);

  const handlePageSizeChange = useCallback((size: number) => {
    updateSearchParams({ limit: size.toString(), page: "1" });
  }, [updateSearchParams]);

  // Transformar datos para la tabla
  const tableData: BatchRow[] = useMemo(() => 
    data.map((b) => ({
      id: b.id,
      code: b.code,
      date: b.createdAt,
      documentId: b.collaborator.documentId ?? null,
      collaborator: b.collaborator.name,
      operator: b.user.name ?? b.user.email,
      warehouse: b.warehouse.name,
      items: b._count.deliveries,
      isCancelled: b.isCancelled,
      cancelledAt: b.cancelledAt ?? null,
      cancellationReason: b.cancellationReason ?? null,
    })), [data]
  );

  const editingBatch = editingItem ? ({
    id: editingItem.id,
    code: editingItem.code,
    collaboratorId: editingItem.collaboratorId,
    warehouseId: editingItem.warehouseId,
    note: editingItem.note ?? "",
    items: editingItem.deliveries.map((d) => ({
      eppId: d.eppId,
      quantity: d.quantity,
    })),
  } as DeliveryBatchValues & { id: number; code: string }) : null;

  // Función para refrescar datos después de operaciones CRUD
  const refreshData = useCallback(() => {
    fetchData();
  }, [fetchData]);

  // Verificar si hay filtros activos
  const hasActiveFilters = !!(currentSearch || currentCollaboratorId || currentWarehouseId || currentLocation || currentDateFrom || currentDateTo);

  return (
    <section className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Entregas</h1>
        <div className="flex gap-2">
          <ExportAllDeliveriesButton 
            searchParams={typeof window !== "undefined" ? window.location.search : ""}
          />
          <Button onClick={() => setShowCreate(true)}>+ Nueva entrega</Button>
        </div>
      </div>

      {/* Estadísticas */}
      {stats && (
        <DeliveryStats
          totalDeliveries={stats.totalDeliveries}
          totalItems={stats.totalItems}
          uniqueCollaborators={stats.uniqueCollaborators}
          thisMonthDeliveries={stats.thisMonthDeliveries}
        />
      )}

      {/* Filtros */}
      <DeliveryFilters
        search={currentSearch}
        collaboratorId={currentCollaboratorId}
        warehouseId={currentWarehouseId}
        location={currentLocation}
        dateFrom={currentDateFrom}
        dateTo={currentDateTo}
        collaborators={filterOptions.collaborators}
        warehouses={filterOptions.warehouses}
        locations={locations}
        onSearchChange={handleSearchChange}
        onCollaboratorChange={handleCollaboratorChange}
        onWarehouseChange={handleWarehouseChange}
        onLocationChange={handleLocationChange}
        onDateFromChange={handleDateFromChange}
        onDateToChange={handleDateToChange}
        onClearFilters={handleClearFilters}
      />

      {/* Contenido principal */}
      {isLoading ? (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Cargando entregas...</span>
        </div>
      ) : (
        <>
          {/* Información de resultados y selector de tamaño */}
          {pagination && (
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600">
                Mostrando {((pagination.page - 1) * pagination.limit) + 1}-{Math.min(pagination.page * pagination.limit, pagination.totalCount)} de {pagination.totalCount} entregas
              </div>
              <PageSizeSelector
                pageSize={pagination.limit}
                onPageSizeChange={handlePageSizeChange}
                totalCount={pagination.totalCount}
              />
            </div>
          )}

          {/* Tabla o estado vacío */}
          {tableData.length === 0 ? (
            <DeliveryEmptyState
              onCreateNew={() => setShowCreate(true)}
              hasFilters={hasActiveFilters}
              onClearFilters={handleClearFilters}
            />
          ) : (
            <DeliveryBatchTable
              data={tableData}
              onEdit={async (row) => {
                try {
                  const res = await fetch(`/api/delivery-batches/${row.id}`);
                  if (!res.ok) throw new Error('Error al cargar el lote');
                  const full: DeliveryBatchDetail = await res.json();
                  setEditingItem(full);
                } catch (e) {
                  console.error(e);
                }
              }}
              onCancel={(row) => {
                const match = data.find((b) => b.id === row.id);
                if (match) setCancelling(match);
              }}
              // TEMPORALMENTE DESHABILITADO: Se está eliminando registros por accidente
              // onDelete={(row) => {
              //   const match = data.find((b) => b.id === row.id);
              //   if (match) setDeleting(match);
              // }}
            />
          )}

          {/* Paginación */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex justify-center">
              <SmartPagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                onPageChange={handlePageChange}
                hasNext={pagination.hasNext}
                hasPrev={pagination.hasPrev}
              />
            </div>
          )}
        </>
      )}

      {/* Modal Crear */}
      {showCreate && (
        <ModalCreateDeliveryBatch
          onClose={() => {
            setShowCreate(false);
            refreshData();
          }}
          onCreated={() => {
            setShowCreate(false);
            refreshData();
          }}
        />
      )}

      {/* Modal Editar */}
      {editingBatch && (
        <ModalEditDeliveryBatch
          batch={editingBatch}
          onClose={() => {
            setEditingItem(null);
            refreshData();
          }}
          onSaved={() => {
            setEditingItem(null);
            refreshData();
          }}
        />
      )}

      {/* Modal Eliminar */}
      {deleting && (
        <ModalDeleteDeliveryBatch
          open={!!deleting}
          onOpenChange={(open) => {
            if (!open) {
              setDeleting(null);
              refreshData();
            }
          }}
          batch={{ id: deleting.id, code: deleting.code }}
          onConfirm={() => {
            setDeleting(null);
            refreshData();
          }}
        />
      )}

      {/* Modal Anular */}
      {cancelling && (
        <ModalCancelDeliveryBatch
          open={!!cancelling}
          onOpenChange={(open) => {
            if (!open) {
              setCancelling(null);
              refreshData();
            }
          }}
          batch={{ id: cancelling.id, code: cancelling.code }}
          onConfirm={() => {
            setCancelling(null);
            refreshData();
          }}
        />
      )}
    </section>
  );
}
