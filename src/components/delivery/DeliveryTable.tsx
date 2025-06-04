"use client";

import { ColumnDef } from "@tanstack/react-table";
import { deleteDeliveryRow } from "@/app/(protected)/deliveries/actions";
import { DataTable } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useTransition } from "react";
import { Badge } from "@/components/ui/badge";

export interface DeliveryRow {
  id:        number;
  date:      string;   // ISO
  eppCode:   string;
  eppName:   string;
  employee:  string;
  warehouse: string;
  quantity:  number;
  operator:  string;
}

export default function DeliveryTable({ data }: { data: DeliveryRow[] }) {
  const [isPending, startTransition] = useTransition();

  const renderDate = (iso: string) => {
    const d = new Date(iso);
    return (
      <time dateTime={iso}>
        {d.toLocaleDateString()}{" "}
        {d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </time>
    );
  };

  const columns: ColumnDef<DeliveryRow>[] = [
    {
      accessorKey: "date",
      header: "Fecha",
      cell: ({ getValue }) => renderDate(getValue<string>()),
    },
    { accessorKey: "eppCode", header: "Código" },
    { accessorKey: "eppName", header: "EPP" },
    { accessorKey: "employee", header: "Empleado" },
    { accessorKey: "warehouse", header: "Almacén" },
    {
      accessorKey: "quantity",
      header: "Cant.",
      cell: ({ getValue }) => <Badge variant="outline">{getValue<number>()}</Badge>,
    },
    { accessorKey: "operator", header: "Operador" },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Button
          size="sm"
          variant="destructive"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              try {
                await deleteDeliveryRow(row.original.id);
                toast.success("Entrega deshecha");
              } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : "Error al deshacer";
                toast.error(msg);
              }
            })
          }
          aria-label={`Deshacer entrega ${row.original.id}`}
        >
          Deshacer
        </Button>
      ),
    },
  ];

  return <DataTable columns={columns} data={data} />;
}
