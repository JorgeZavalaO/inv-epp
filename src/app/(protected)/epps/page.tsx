"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Search, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import EppTable, { EppRow } from "@/components/epp/EppTable";
import { useDebounce } from "@/lib/useDebounce";

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

export default function EppsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const [query, setQuery] = useState(initialQuery);
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<EppRow[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  // Debounce la búsqueda para no hacer demasiadas peticiones
  const debouncedQuery = useDebounce(query, 300);

  // Cargar almacenes al montar
  useEffect(() => {
    fetch("/api/warehouses")
      .then((res) => res.json())
      .then((list: Warehouse[]) => setWarehouses(list))
      .catch(() => setWarehouses([]));
  }, []);

  // Función para buscar EPPs
  const searchEpps = useCallback(async (searchQuery: string) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) {
        params.set("q", searchQuery.trim());
      }

      const response = await fetch(`/api/epps/search?${params.toString()}`);
      if (!response.ok) throw new Error("Error al buscar EPPs");

      const epps: EPPFromAPI[] = await response.json();

      // Mapear los datos al formato esperado por EppTable
      const mappedData: EppRow[] = epps.map((e: EPPFromAPI) => ({
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
    } catch (error) {
      console.error("Error searching EPPs:", error);
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [warehouses]);

  // Buscar cuando cambie la query debounced
  useEffect(() => {
    searchEpps(debouncedQuery);
  }, [debouncedQuery, searchEpps]);

  // Actualizar URL cuando cambie la query
  useEffect(() => {
    const params = new URLSearchParams();
    if (query.trim()) {
      params.set("q", query.trim());
    }

    const newUrl = query.trim() ? `/epps?${params.toString()}` : "/epps";
    router.replace(newUrl, { scroll: false });
  }, [query, router]);

  // Limpiar búsqueda
  const clearSearch = () => {
    setQuery("");
  };

  // Calcular estadísticas
  const stats = useMemo(() => {
    const totalItems = data.length;
    const totalStock = data.reduce((sum, item) => sum + item.stock, 0);
    return { totalItems, totalStock };
  }, [data]);

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
            onChange={(e) => setQuery(e.target.value)}
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
      />
    </section>
  );
}
