// 📁 src/app/(protected)/warehouses/WarehousesClient.tsx
"use client";

import { useCallback, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet } from "lucide-react";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

import ModalCreateWarehouse from "@/components/warehouses/ModalCreateWarehouse";
import ModalEditWarehouse   from "@/components/warehouses/ModalEditWarehouse";
import { deleteWarehouseAction } from "@/app/(protected)/warehouses/actions";
import { useWarehouseStocksXlsx } from "@/lib/client-excel/useWarehouseStocksXlsx";
import SmartPagination from "@/components/delivery/SmartPagination";
import PageSizeSelector from "@/components/delivery/PageSizeSelector";

/* ─── Tipo con stock total ───────────────────────────────── */
export interface WarehouseWithStock {
  id:         number;
  name:       string;
  location:   string | null;
  totalStock: number;
}

interface WarehousesClientProps {
  list: WarehouseWithStock[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  canExport?: boolean;
}

export default function WarehousesClient({ list, pagination, canExport = true }: WarehousesClientProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingWarehouse, setEditingWarehouse] =
    useState<WarehouseWithStock | null>(null);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const exportStocks = useWarehouseStocksXlsx();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateSearchParams = useCallback((values: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(values).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router, searchParams]);

  const handleDelete = (id: number) => {
    const fd = new FormData();
    fd.append("id", id.toString());
    setPendingId(id);

    (async () => {
      try {
        await deleteWarehouseAction(fd);
        toast.success("Almacén eliminado correctamente");
        if (editingWarehouse?.id === id) setEditingWarehouse(null);
        router.refresh();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Error al eliminar";
        toast.error(message);
      } finally {
        setPendingId(null);
      }
    })();
  };

  return (
    <section className="space-y-6 px-4 md:px-8 py-6">
      {/* Header + Botón Nuevo */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Almacenes</h1>
        <div className="flex items-center gap-2">
          {canExport && (
          <Button variant="secondary" onClick={exportStocks} aria-label="Exportar stocks por almacén a Excel">
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Exportar Excel
          </Button>
          )}
          <Button onClick={() => setShowCreateModal(true)}>
            + Nuevo almacén
          </Button>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Lista de almacenes</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="p-2 text-left">Nombre</th>
                <th className="p-2 text-left">Ubicación</th>
                <th className="p-2 text-center">Stock registrado</th>
                <th className="p-2 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {list.map((w) => (
                <tr key={w.id} className="border-b hover:bg-muted/50">
                  <td className="p-2">{w.name}</td>
                  <td className="p-2">{w.location || "-"}</td>
                  <td className="p-2 text-center">
                    <span className="inline-block bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs">
                      {w.totalStock}
                    </span>
                  </td>
                  <td className="p-2 text-center flex items-center justify-center gap-2">
                    {/* Editar */}
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setEditingWarehouse(w)}
                    >
                      Editar
                    </Button>

                    {/* Eliminar */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={pendingId === w.id}
                        >
                          Eliminar
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            ¿Eliminar el almacén “{w.name}”?
                          </AlertDialogTitle>
                        </AlertDialogHeader>
                        <p className="text-sm text-muted-foreground">
                          Esta acción no se puede deshacer. Si el almacén tiene
                          existencias, la operación fallará.
                        </p>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(w.id)}
                            disabled={pendingId === w.id}
                          >
                            Confirmar eliminación
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="text-center py-4 text-muted-foreground"
                  >
                    No hay almacenes aún
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            Showing {list.length === 0 ? 0 : ((pagination.page - 1) * pagination.limit) + 1}-{Math.min(pagination.page * pagination.limit, pagination.totalCount)} of {pagination.totalCount} warehouses
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

      {/* Modales */}
      {showCreateModal && (
        <ModalCreateWarehouse onClose={() => { setShowCreateModal(false); router.refresh(); }} />
      )}
      {editingWarehouse && (
        <ModalEditWarehouse
          warehouse={editingWarehouse}
          onClose={() => { setEditingWarehouse(null); router.refresh(); }}
        />
      )}
    </section>
  );
}
