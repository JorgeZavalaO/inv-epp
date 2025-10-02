"use client";

import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/DataTable";
import { Button }    from "@/components/ui/button";
import { formatDateLima } from "@/lib/formatDate";
import Link from "next/link";

export interface BatchRow {
  id:           number;
  code:         string;
  date:         string;
  collaborator: string;
  operator:     string;
  warehouse:    string;
  items:        number;
}

interface Props {
  data: BatchRow[];
  onEdit(row: BatchRow): void;
  // onDelete(row: BatchRow): void; // TEMPORALMENTE DESHABILITADO
}

export default function DeliveryBatchTable({ data, onEdit }: Props) {
  const columns: ColumnDef<BatchRow>[] = [
    { accessorKey: "code", header: "Código" },
    {
      accessorKey: "date",
      header: "Fecha",
      cell: ({ getValue }) => {
        const iso = getValue<string>();
        return <time dateTime={iso}>{formatDateLima(iso)}</time>;
        // const d   = new Date(iso);
        // return (
        //   <time dateTime={iso}>
        //     {d.toLocaleDateString()} {d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        //   </time>
        // );
      },
    },
    { accessorKey: "collaborator", header: "Colaborador" },
    { accessorKey: "warehouse", header: "Almacén" },
    { accessorKey: "operator",     header: "Operador" },
    {
      accessorKey: "items",
      header: "Ítems",
      cell: ({ getValue }) => (
        <span className="inline-block bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs">
          {getValue<number>()}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Acciones",
      cell: ({ row }) => (
        <div role="group" aria-label={`Acciones para entrega ${row.original.code}`} className="flex gap-2">
          <Link href={`/deliveries/${row.original.id}`} aria-label={`Ver entrega ${row.original.code}`}>
            <Button size="sm">Ver</Button>
          </Link>
          <Button size="sm" variant="secondary" aria-label={`Editar entrega ${row.original.code}`} onClick={() => onEdit(row.original)}>Editar</Button>
          {/* TEMPORALMENTE DESHABILITADO: Se está eliminando registros por accidente */}
          {/* <Button size="sm" variant="destructive" aria-label={`Eliminar entrega ${row.original.code}`} onClick={() => onDelete(row.original)}>Eliminar</Button> */}
        </div>
      ),
    },
  ];

  return <DataTable columns={columns} data={data} />;
}
