"use client";

import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ReturnRow } from "./ReturnClient";

interface Props {
  data: ReturnRow[];
  onDelete(row: ReturnRow): void;
}

export default function ReturnTable({ data, onDelete }: Props) {
  const cols: ColumnDef<ReturnRow>[] = [
    {
      accessorKey: "date",
      header: "Fecha",
      cell: ({ getValue }) => new Date(getValue<string>()).toLocaleString(),
    },
    { accessorKey: "eppCode", header: "Código" },
    { accessorKey: "eppName", header: "EPP" },
    { accessorKey: "employee", header: "Empleado" },
    { accessorKey: "quantity", header: "Cant." },
    {
      accessorKey: "condition",
      header: "Cond.",
      cell: ({ getValue }) => {
        const c = getValue<ReturnRow["condition"]>();
        return (
          <Badge variant={c === "REUSABLE" ? "default" : "destructive"}>
            {c === "REUSABLE" ? "Reutilizable" : "Descartado"}
          </Badge>
        );
      },
    },
    { accessorKey: "operator", header: "Operador" },
    {
      id: "actions",
      cell: ({ row }) => (
        <Button
          size="sm"
          variant="destructive"
          onClick={() => onDelete(row.original)}
        >
          Deshacer
        </Button>
      ),
    },
  ];

  return <DataTable columns={cols} data={data} />;
}
