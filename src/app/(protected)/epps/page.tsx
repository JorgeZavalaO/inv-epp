"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Search, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import EppTable, { EppRow } from "@/components/epp/EppTable";
import { useDebounce } from "@/lib/useDebounce";
import SmartPagination from "@/components/delivery/SmartPagination";
import PageSizeSelector from "@/components/delivery/PageSizeSelector";
import { parsePagination } from "@/lib/pagination";

type Warehouse = { id: number; name: string };

interface EPPFromAPI {
  id: number;
  code: string;
  name: string;
  category: string;
  subcategory: string | null;
  description: string | null;
  minStock: number;
  stocks: Array<{
    warehouseId: number;
    quantity: number;
  }>;
  _count: {
    movements: number;
  };
}

interface PaginationInfo {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface EppSearchResponse {
  epps: EPPFromAPI[];
  totalStock: number;
  pagination: PaginationInfo;
}

export default function EppsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const [query, setQuery] = useState(initialQuery);
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<EppRow[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [totalStock, setTotalStock] = useState(0);
  const lastUrlQuery = useRef(initialQuery);

  // Debounce la búsqueda para no hacer demasiadas peticiones
  const debouncedQuery = useDebounce(query, 300);

  // Cargar almacenes al montar
  useEffect(() => {
    fetch("/api/warehouses")
      .then((res) => res.json())
      .then((list: Warehouse[]) => setWarehouses(list))
      .catch(() => setWarehouses([]));
  }, []);

  const rawPage = searchParams.get("page");
  const rawLimit = searchParams.get("limit");
  const { page: currentPage, limit: currentLimit } = parsePagination(rawPage, rawLimit);

  const updateSearchParams = useCallback((values: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(values).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    router.replace(`/epps?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  useEffect(() => {
    const values: Record<string, string> = {};
    if (rawPage !== null && rawPage !== String(currentPage)) {
      values.page = String(currentPage);
    }
    if (rawLimit !== null && rawLimit !== String(currentLimit)) {
      values.limit = String(currentLimit);
    }
    if (Object.keys(values).length > 0) {
      updateSearchParams(values);
    }
  }, [currentLimit, currentPage, rawLimit, rawPage, updateSearchParams]);

  useEffect(() => {
    const urlQuery = searchParams.get("q") || "";
    if (urlQuery !== lastUrlQuery.current) {
      lastUrlQuery.current = urlQuery;
      setQuery(urlQuery);
    }
  }, [searchParams]);

  // Search EPPs on the server and keep pagination metadata alongside the rows.
  const searchEpps = useCallback(async (searchQuery: string, page: number, limit: number) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (searchQuery.trim()) {
        params.set("q", searchQuery.trim());
      }

      const response = await fetch(`/api/epps/search?${params.toString()}`);
      if (!response.ok) throw new Error("Error al buscar EPPs");

      const result: EppSearchResponse = await response.json();

      // Mapear los datos al formato esperado por EppTable
      const mappedData: EppRow[] = result.epps.map((e: EPPFromAPI) => ({
        id: e.id,
        code: e.code,
        name: e.name,
        category: e.category,
        subcategory: e.subcategory,
        stock: e.stocks?.reduce((sum: number, s) => sum + s.quantity, 0) || 0,
        description: e.description,
        minStock: e.minStock,
        hasMovement: e._count?.movements > 0,
        items: e.stocks?.map((s) => ({
          warehouseId: s.warehouseId,
          warehouseName: warehouses.find(w => w.id === s.warehouseId)?.name || `Almacén ${s.warehouseId}`,
          quantity: s.quantity,
        })) || [],
      }));

      setData(mappedData);
      setPagination(result.pagination);
      setTotalStock(result.totalStock);
      if (result.pagination.page !== page) {
        updateSearchParams({ page: String(result.pagination.page) });
      }
    } catch (error) {
      console.error("Error searching EPPs:", error);
      setData([]);
      setPagination(null);
      setTotalStock(0);
    } finally {
      setIsLoading(false);
    }
  }, [updateSearchParams, warehouses]);

  // Buscar cuando cambie la query debounced
  useEffect(() => {
    searchEpps(debouncedQuery, currentPage, currentLimit);
  }, [currentLimit, currentPage, debouncedQuery, searchEpps]);

  // Limpiar búsqueda
  const clearSearch = () => {
    setQuery("");
    updateSearchParams({ q: "", page: "1" });
  };

  const stats = useMemo(() => ({
    totalItems: pagination?.totalCount ?? 0,
    totalStock,
  }), [pagination?.totalCount, totalStock]);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    updateSearchParams({ q: value.trim(), page: "1" });
  };

  const refreshData = useCallback(() => {
    searchEpps(debouncedQuery, currentPage, currentLimit);
  }, [currentLimit, currentPage, debouncedQuery, searchEpps]);

  return (
    <section className="py-6 px-4 md:px-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Catálogo de EPPs</h1>
        <p className="text-muted-foreground">Gestiona tu inventario de equipos de protección personal</p>
      </div>

      {/* BUSCADOR */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between p-4 bg-gradient-to-r from-blue-50 to-transparent rounded-lg border border-blue-100">
        <div className="flex-1 md:max-w-sm relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Buscar por código, nombre o categoría..."
            className="pl-10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            autoFocus={initialQuery ? true : false}
          />
          {query && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearSearch}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-red-50 hover:text-red-600"
              title="Limpiar búsqueda"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
          {isLoading && (
            <Loader2 className="absolute right-10 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-blue-500" />
          )}
        </div>

        <div className="flex items-center gap-4">
          {query && (
            <p className="text-sm text-muted-foreground">
              Mostrando resultados para: <span className="font-semibold text-slate-900">&quot;{query}&quot;</span>
            </p>
          )}
          {!query && !isLoading && (
            <p className="text-sm text-muted-foreground">
              {stats.totalItems} productos • {stats.totalStock} unidades totales
            </p>
          )}
        </div>
      </div>

  <EppTable
        data={data}
        warehouses={warehouses}
        onChanged={refreshData}
      />

      {pagination && (
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              Showing {data.length === 0 ? 0 : ((pagination.page - 1) * pagination.limit) + 1}-{Math.min(pagination.page * pagination.limit, pagination.totalCount)} of {pagination.totalCount} products
            </div>
            <PageSizeSelector
              pageSize={pagination.limit}
              onPageSizeChange={(size) => updateSearchParams({ limit: String(size), page: "1" })}
              totalCount={pagination.totalCount}
            />
          </div>
          {pagination.totalPages > 1 && (
            <SmartPagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={(page) => updateSearchParams({ page: String(page) })}
              hasNext={pagination.hasNext}
              hasPrev={pagination.hasPrev}
            />
          )}
        </div>
      )}
    </section>
  );
}
