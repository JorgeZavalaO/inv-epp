"use client";

import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/DataTable";
import { useState, useTransition } from "react";
import { deleteEpp } from "@/app/(protected)/epps/actions";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import ModalCreateEpp from "@/components/epp/ModalCreateEpp";
import ModalEditEpp from "@/components/epp/ModalEditEpp";

/* ─────── Tipado de cada fila ─────────────────────────── */
type Row = {
  id: number;
  code: string;
  name: string;
  category: string;
  description: string | null;
  stock: number;
  minStock: number;
  hasMovement: boolean;
  warehouseId: number | null;
  initialQty: number | null;
};

export default function EppTable({ data }: { data: Row[] }) {
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Row | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);

  const columns: ColumnDef<Row>[] = [
    { accessorKey: "code", header: "Código" },
    { accessorKey: "name", header: "Nombre" },
    { accessorKey: "category", header: "Categoría" },
    { accessorKey: "stock", header: "Stock actual" },
    { accessorKey: "minStock", header: "Mínimo" },
    // Podrías mostrar almacén e initialQty si quieres:
    {
      accessorKey: "warehouseId",
      header: "Almacén",
      cell: ({ row }) => (row.original.warehouseId ?? "-"),
    },
    {
      accessorKey: "initialQty",
      header: "Cant. inicial",
      cell: ({ row }) => (row.original.initialQty ?? "-"),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="flex gap-2">
            {/* Botón Editar */}
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setEditing(item)}
            >
              Editar
            </Button>

            {/* Botón Eliminar con alerta */}
            <AlertDialog
              open={!!selected && selected.id === item.id}
              onOpenChange={(open) => !open && setSelected(null)}
            >
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setSelected(item)}
                >
                  Eliminar
                </Button>
              </AlertDialogTrigger>

              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Eliminar EPP?</AlertDialogTitle>
                </AlertDialogHeader>
                <p className="text-sm text-muted-foreground">
                  {selected?.hasMovement
                    ? `El EPP "${selected.name}" tiene movimientos y no se puede eliminar.`
                    : `¿Seguro que deseas eliminar "${selected?.name}"? Acción irreversible.`}
                </p>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={pending || !!selected?.hasMovement}
                    onClick={() =>
                      startTransition(async () => {
                        if (!selected || selected.hasMovement) return;
                        try {
                          await deleteEpp(selected.id);
                          toast.success("EPP eliminado");
                          setSelected(null);
                        } catch (err) {
                          toast.error(
                            err instanceof Error
                              ? err.message
                              : "Error al eliminar"
                          );
                        }
                      })
                    }
                  >
                    Eliminar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        );
      },
    },
  ];

  return (
    <>
      {/* Botón “+ Nuevo EPP” */}
      <div className="flex justify-end mb-4">
        <Button onClick={() => setShowCreate(true)}>+ Nuevo EPP</Button>
      </div>

      <DataTable columns={columns} data={data} />

      {/* Modales */}
      {showCreate && <ModalCreateEpp onClose={() => setShowCreate(false)} />}
      {editing && (
        <ModalEditEpp epp={editing} onClose={() => setEditing(null)} />
      )}
    </>
  );
}
