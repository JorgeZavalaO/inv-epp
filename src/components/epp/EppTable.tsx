"use client";

import { EPP } from "@prisma/client";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/DataTable";
import { useTransition } from "react";
import { deleteEpp } from "@/app/(protected)/epps/actions";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { toast } from "sonner";

export default function EppTable({ data }: { data: EPP[] }) {
  const [isPending, startTransition] = useTransition();

  const columns: ColumnDef<EPP>[] = [
    { accessorKey: "code", header: "Código" },
    { accessorKey: "name", header: "Nombre" },
    { accessorKey: "category", header: "Categoría" },
    { accessorKey: "stock", header: "Stock" },
    { accessorKey: "minStock", header: "Mínimo" },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Link href={`/epps/${row.original.id}`}>
            <Button size="sm" variant="secondary" aria-label="Editar EPP">
              Editar
            </Button>
          </Link>
          <Button
            size="sm"
            variant="destructive"
            aria-label="Eliminar EPP"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                await deleteEpp(row.original.id);
                toast.success("EPP eliminado exitosamente");
              })
            }
          >
            Eliminar
          </Button>
        </div>
      ),
    },
  ];

  return <DataTable columns={columns} data={data} />;
}
