"use client";

import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/DataTable";
import { Button }    from "@/components/ui/button";
import { Badge }     from "@/components/ui/badge";
import { formatDateLima } from "@/lib/formatDate";
import Link from "next/link";

export interface BatchRow {
  id:           number;
  code:         string;
  date:         string;
  documentId?:  string | null;
  collaborator: string;
  operator:     string;
  warehouse:    string;
  items:        number;
  isCancelled:  boolean;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
}

interface Props {
  data: BatchRow[];
  onEdit(row: BatchRow): void;
  onCancel?(row: BatchRow): void;
  // onDelete(row: BatchRow): void; // TEMPORALMENTE DESHABILITADO
}

export default function DeliveryBatchTable({ data, onEdit, onCancel }: Props) {
  const columns: ColumnDef<BatchRow>[] = [
    { 
      accessorKey: "code", 
      header: "Código",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span>{row.original.code}</span>
          {row.original.isCancelled && (
            <Badge variant="destructive" className="text-xs">
              ANULADO
            </Badge>
          )}
        </div>
      ),
    },
    { accessorKey: "documentId", header: "DNI",
      cell: ({ getValue }) => {
        const dni = getValue<string | null>();
        return <span>{dni ?? ""}</span>;
      }
    },
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
      cell: ({ row }) => {
        const isCancelled = row.original.isCancelled;
        return (
          <div role="group" aria-label={`Acciones para entrega ${row.original.code}`} className="flex gap-2">
            <Link href={`/deliveries/${row.original.id}`} aria-label={`Ver entrega ${row.original.code}`}>
              <Button size="sm">{isCancelled ? "Ver Detalle" : "Ver"}</Button>
            </Link>
            {!isCancelled && (
              <>
                <Button 
                  size="sm" 
                  variant="secondary" 
                  aria-label={`Editar entrega ${row.original.code}`} 
                  onClick={() => onEdit(row.original)}
                >
                  Editar
                </Button>
                {onCancel && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    aria-label={`Anular entrega ${row.original.code}`} 
                    onClick={() => onCancel(row.original)}
                  >
                    Anular
                  </Button>
                )}
              </>
            )}
            {/* TEMPORALMENTE DESHABILITADO: Se está eliminando registros por accidente */}
            {/* <Button size="sm" variant="destructive" aria-label={`Eliminar entrega ${row.original.code}`} onClick={() => onDelete(row.original)}>Eliminar</Button> */}
          </div>
        );
      },
    },
  ];

  return <DataTable columns={columns} data={data} />;
}
