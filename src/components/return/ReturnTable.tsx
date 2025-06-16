"use client";

import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/DataTable";
import { Button }    from "@/components/ui/button";
import { ReturnBatchRow } from "./ReturnClient";

interface Props {
  data: ReturnBatchRow[];
  onDelete(batch: ReturnBatchRow): void;
  onView(batch:  ReturnBatchRow): void;
}

export default function ReturnTable({ data, onDelete, onView }: Props) {
  const cols: ColumnDef<ReturnBatchRow>[] = [
    { accessorKey: "code", header: "Código" },
    {
      accessorKey: "date",
      header: "Fecha",
      cell: ({ getValue }) =>
        new Date(getValue<string>()).toLocaleString(),
    },
    { accessorKey: "warehouse", header: "Almacén" },
    { accessorKey: "user",      header: "Usuario" },
    {
      accessorKey: "count",
      header: "Ítems",
      cell: ({ getValue }) => (
        <span className="px-2 py-0.5 bg-blue-100 rounded text-xs">
          {getValue<number>()}
        </span>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => onView(row.original)}>
            Ver
          </Button>
          <Button size="sm" variant="destructive" onClick={() => onDelete(row.original)}>
            Deshacer
          </Button>
        </div>
      ),
    },
  ];
  return <DataTable columns={cols} data={data} />;
}
