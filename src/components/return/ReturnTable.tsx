"use client";
import { ColumnDef } from "@tanstack/react-table";
import { deleteReturn } from "@/app/(protected)/returns/actions";
import { DataTable } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useTransition } from "react";
import { Badge } from "@/components/ui/badge";

export interface ReturnRow {
  id: number;
  date: string;
  eppCode: string;
  eppName: string;
  employee: string;
  quantity: number;
  condition: "REUSABLE" | "DISCARDED";
  operator: string;
}

export default function ReturnTable({ data }: { data: ReturnRow[] }) {
  const [isPending, start] = useTransition();

  const condBadge = (c: ReturnRow["condition"]) => (
    <Badge variant={c === "REUSABLE" ? "default" : "destructive"}>
      {c === "REUSABLE" ? "Reutilizable" : "Descartado"}
    </Badge>
  );

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
      cell: ({ getValue }) => condBadge(getValue<ReturnRow["condition"]>()),
    },
    { accessorKey: "operator", header: "Operador" },
    {
      id: "actions",
      cell: ({ row }) => (
        <Button
          size="sm"
          variant="destructive"
          disabled={isPending}
          onClick={() =>
            start(async () => {
              try {
                await deleteReturn(row.original.id);
                toast.success("Devolución deshecha");
              } catch (e: unknown) {
                const message =
                  e instanceof Error ? e.message : "Error";
                toast.error(message);
              }
            })
          }
        >
          Deshacer
        </Button>
      ),
    },
  ];

  return <DataTable columns={cols} data={data} />;
}
