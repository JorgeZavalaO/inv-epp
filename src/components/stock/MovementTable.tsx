"use client";
import { ColumnDef } from "@tanstack/react-table";
import { deleteMovement } from "@/app/(protected)/stock-movements/actions";
import { DataTable } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useTransition } from "react";
import { Badge } from "@/components/ui/badge";

export interface Row {
  id: number;
  date: string;        
  eppCode: string;
  eppName: string;
  quantity: number;
  type: "ENTRY" | "EXIT" | "ADJUSTMENT";
  operator: string;        
}

export default function MovementTable({ data }: { data: Row[] }) {
  const [isPending, start] = useTransition();
  const typeBadge = (t: Row["type"]) => (
    <Badge variant={
        t === "ENTRY" ? "default" : t === "EXIT" ? "destructive" : "secondary"
    }>
        {t === "ENTRY" ? "Entrada" : t === "EXIT" ? "Salida" : "Ajuste"}
    </Badge>
    );

  const cols: ColumnDef<Row>[] = [
    {
        accessorKey: "date",
        header: "Fecha",
        cell: ({ getValue }) => {
        const d = new Date(getValue<string>());
        return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      },
    },
    { accessorKey: "eppCode", header: "Código" },
    { accessorKey: "eppName", header: "EPP" },
    {
      accessorKey: "quantity",
      header: "Cant.",
      cell: ({ row }) => {
        const { quantity, type } = row.original;
        const color = type === "ENTRY" ? "text-green-600" : type === "EXIT" ? "text-red-600" : "";
        return <span className={`${color} font-medium`}>{quantity}</span>;
      },
    },
    {
        accessorKey: "type",
        header: "Tipo",
        cell: ({ getValue }) => typeBadge(getValue<Row["type"]>()),
    },
    { accessorKey: "operator", header: "Operador" },
    {
          id: "actions",
          header: " ",
          cell: ({ row }) =>
            row.original.type !== "ADJUSTMENT" && (
              <Button
                size="sm"
                variant="destructive"
                disabled={isPending}
                onClick={() =>
                  start(async () => {
                    try {
                      await deleteMovement(row.original.id);
                      toast.success("Movimiento deshecho");
                    } catch (e: unknown) {
                      const message = e instanceof Error ? e.message : "Ocurrió un error";
                      toast.error(message);
                    }
                  })
                }
              >
                🗑 Deshacer
              </Button>
            ),
      },
  ];

  return <DataTable columns={cols} data={data} />;
}
