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
import ModalCreateEpp from "./ModalCreateEpp";
import ModalEditEpp   from "./ModalEditEpp";
import ModalViewEpp   from "./ModalViewEpp";

export type EppRow = {
  id:          number;
  code:        string;
  name:        string;
  category:    string;
  stock:       number;
  description: string | null;
  minStock:    number;
  hasMovement: boolean;
  items: {
    warehouseId:   number;
    warehouseName: string;
    quantity:      number;
  }[];
};

export default function EppTable({ data }: { data: EppRow[] }) {
  const [pending, startTransition] = useTransition();
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing]       = useState<EppRow | null>(null);
  const [viewing, setViewing]       = useState<EppRow | null>(null);
  const [deleting, setDeleting]     = useState<EppRow | null>(null);

  const columns: ColumnDef<EppRow>[] = [
    { accessorKey: "code", header: "Código" },
    { accessorKey: "name", header: "Nombre" },
    { accessorKey: "category", header: "Categoría" },
    { accessorKey: "stock", header: "Stock actual" },
    {
      id: "actions",
      header: "Acciones",
      cell: ({ row }) => {
        const e = row.original;
        return (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setViewing(e)}>
              Ver
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setEditing(e)}>
              Editar
            </Button>
            <AlertDialog
              open={deleting?.id === e.id}
              onOpenChange={(o) => !o && setDeleting(null)}
            >
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setDeleting(e)}
                  disabled={pending || e.hasMovement}
                >
                  Eliminar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {e.hasMovement
                      ? `No se puede eliminar "${e.name}"`
                      : `Eliminar "${e.name}"?`}
                  </AlertDialogTitle>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex gap-2">
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={pending || e.hasMovement}
                    onClick={() =>
                      startTransition(async () => {
                        try {
                          await deleteEpp(e.id);
                          toast.success("EPP eliminado");
                          setDeleting(null);
                        } catch (err: unknown) {
                          const message =
                            err instanceof Error ? err.message : "Error desconocido";
                          toast.error(message);
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
      <div className="flex justify-end mb-4">
        <Button onClick={() => setShowCreate(true)}>+ Nuevo EPP</Button>
      </div>

      <DataTable columns={columns} data={data} />

      {showCreate && <ModalCreateEpp onClose={() => setShowCreate(false)} />}
      {editing && (
        <ModalEditEpp
          epp={{
            ...editing,
            items: editing.items.map(item => ({
              warehouseId: item.warehouseId,
              initialQty: item.quantity,
            })),
          }}
          onClose={() => setEditing(null)}
        />
      )}
      {viewing && <ModalViewEpp epp={viewing} onClose={() => setViewing(null)} />}
    </>
  );
}
