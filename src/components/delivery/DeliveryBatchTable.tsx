"use client";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/DataTable";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export interface BatchRow {
  id: number;
  date: string;
  employee: string;
  operator: string;
  items: number;
}

export default function DeliveryBatchTable({ data }: { data: BatchRow[] }) {
  const columns: ColumnDef<BatchRow>[] = [
    {
      accessorKey: "date",
      header: "Fecha",
      cell: ({ getValue }) => {
        const d = new Date(getValue<string>());
        return (
          <time dateTime={getValue<string>()}>
            {d.toLocaleDateString()}{" "}
            {d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </time>
        );
      },
    },
    { accessorKey: "employee", header: "Empleado" },
    { accessorKey: "operator", header: "Operador" },
    {
      accessorKey: "items",
      header: "Ítems",
      cell: ({ getValue }) => <Badge>{getValue<number>()}</Badge>,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Link href={`/deliveries/${row.original.id}`}>
          <span className="text-primary underline">Ver detalle</span>
        </Link>
      ),
    },
  ];

  return <DataTable columns={columns} data={data} />;
}
