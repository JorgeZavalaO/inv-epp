"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
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
import ModalEditWarehouse from "@/components/warehouses/ModalEditWarehouse";
import { deleteWarehouseAction } from "@/app/(protected)/warehouses/actions";

/* ─────── Types ───────────────────────────────────────── */
interface WarehouseFromDB {
  id: number;
  name: string;
  location: string | null;
  _count: { stocks: number };
}

interface WarehousesClientProps {
  list: WarehouseFromDB[];
}

/* ─────── Componente principal ───────────────────────── */
export default function WarehousesClient({ list }: WarehousesClientProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingWarehouse, setEditingWarehouse] =
    useState<WarehouseFromDB | null>(null);

  const [pendingId, setPendingId] = useState<number | null>(null);

  /* ——— Eliminar con verificación backend ——— */
  const handleDelete = (id: number) => {
    const fd = new FormData();
    fd.append("id", id.toString());

    setPendingId(id);

    (async () => {
      try {
        await deleteWarehouseAction(fd);
        toast.success("Almacén eliminado correctamente");
        if (editingWarehouse?.id === id) setEditingWarehouse(null);
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : "No se pudo eliminar el almacén";
        toast.error(message);
      } finally {
        setPendingId(null);
      }
    })();
  };

  return (
    <section className="space-y-6 px-4 md:px-8 py-6">
      {/* Header + Btn nuevo */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Almacenes</h1>
        <Button onClick={() => setShowCreateModal(true)}>+ Nuevo almacén</Button>
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
                      {w._count.stocks}
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

                    {/* Eliminar con AlertDialog */}
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

      {/* MODALES */}
      {showCreateModal && (
        <ModalCreateWarehouse onClose={() => setShowCreateModal(false)} />
      )}
      {editingWarehouse && (
        <ModalEditWarehouse
          warehouse={editingWarehouse}
          onClose={() => setEditingWarehouse(null)}
        />
      )}
    </section>
  );
}
