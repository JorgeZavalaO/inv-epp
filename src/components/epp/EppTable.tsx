"use client";

//import { EPP } from "@prisma/client";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/DataTable";
import { useTransition, useState } from "react";
import { deleteEpp } from "@/app/(protected)/epps/actions";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  AlertDialogPortal,
  AlertDialogOverlay
} from "@/components/ui/alert-dialog";

type Row = {
  id: number;
  code: string;
  name: string;
  category: string;
  stock: number;
  minStock: number;
  hasMovement: boolean;
};

export default function EppTable({ data }: { data: Row[] }) {
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<{
    id: number;
    name: string;
    hasMovement: boolean;
  } | null>(null);

  const columns: ColumnDef<Row>[] = [
    { accessorKey: "code", header: "Código" },
    { accessorKey: "name", header: "Nombre" },
    { accessorKey: "category", header: "Categoría" },
    { accessorKey: "stock", header: "Stock" },
    { accessorKey: "minStock", header: "Mínimo" },
    {
      id: "actions",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="flex gap-2">
            <Link href={`/epps/${item.id}`}>
              <Button size="sm" variant="secondary" aria-label="Editar EPP">
                Editar
              </Button>
            </Link>
            <AlertDialog
              open={!!selected && selected.id === item.id}
              onOpenChange={(open) => {
                if (!open) setSelected(null);
              }}
            >
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="destructive"
                  aria-label="Eliminar EPP"
                  onClick={() => setSelected(item)}
                >
                  Eliminar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogPortal>
                <AlertDialogOverlay className="fixed inset-0 bg-black/50 z-40" />
                <AlertDialogContent className="fixed z-50 left-1/2 top-1/2 w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white dark:bg-zinc-900 p-6 shadow-lg">
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Eliminar EPP?</AlertDialogTitle>
                    <AlertDialogDescription>
                      {selected?.hasMovement
                        ? `El EPP "${selected.name}" tiene movimientos registrados y no se puede eliminar.`
                        : `¿Estás seguro de que deseas eliminar el EPP "${selected?.name}"? Esta acción no se puede deshacer.`}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel asChild>
                      <Button variant="outline">Cancelar</Button>
                    </AlertDialogCancel>
                    <AlertDialogAction asChild>
                      <Button
                        variant="destructive"
                        disabled={isPending || !!selected?.hasMovement}
                        onClick={() =>
                          startTransition(async () => {
                            if (!selected || selected.hasMovement) return;
                            await deleteEpp(selected.id);
                            toast.success("EPP eliminado exitosamente");
                            setSelected(null);
                          })
                        }
                      >
                        Eliminar
                      </Button>
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialogPortal>
            </AlertDialog>
          </div>
        );
      },
    },
  ];

  return <DataTable columns={columns} data={data} />;
}
