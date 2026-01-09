"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge }  from "@/components/ui/badge";
import { DataTable } from "@/components/ui/DataTable";

export interface Row {
  /* columnas visibles */
  id: number;
  date: string;
  eppCode: string;
  eppName: string;
  warehouse: string;
  quantity: number;
  type: "ENTRY" | "EXIT" | "ADJUSTMENT";
  operator: string;
  unitPrice?: number | null;
  purchaseOrder?: string | null;

  /* necesarios para los modales */
  eppId: number;
  warehouseId: number;
  note?: string | null;
}

interface Props {
  data: Row[];
  onEdit:   (row: Row) => void;
  onDelete: (row: Row) => void;
}

export default function MovementTable({ data, onEdit, onDelete }: Props) {
  const typeBadge = (t: Row["type"]) => (
    <Badge variant={t === "ENTRY" ? "default" : t === "EXIT" ? "destructive" : "secondary"}>
      {t === "ENTRY" ? "Entrada" : t === "EXIT" ? "Salida" : "Ajuste"}
    </Badge>
  );

  const columns: ColumnDef<Row>[] = [
    {
      accessorKey: "date",
      header: "Fecha",
      cell: ({ getValue }) => {
        const d = new Date(getValue<string>());
        return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}`;
      },
    },
    { accessorKey: "eppCode", header: "Código" },
    { accessorKey: "eppName", header: "EPP" },
    { accessorKey: "warehouse", header: "Almacén" },
    {
      accessorKey: "quantity",
      header: "Cant.",
      cell: ({ row }) => {
        const { quantity, type } = row.original;
        const color =
          type === "ENTRY"
            ? "text-green-600"
            : type === "EXIT"
            ? "text-red-600"
            : "";
        return <span className={`${color} font-medium`}>{quantity}</span>;
      },
    },
    {
      accessorKey: "type",
      header: "Tipo",
      cell: ({ getValue }) => typeBadge(getValue<Row["type"]>()),
    },
    {
      accessorKey: "purchaseOrder",
      header: "Orden de Compra",
      cell: ({ getValue }) => {
        const po = getValue<string | null>();
        return po ? <span className="font-mono text-sm">{po}</span> : <span className="text-muted-foreground">-</span>;
      },
    },
    {
      accessorKey: "unitPrice",
      header: "Precio Unit.",
      cell: ({ getValue }) => {
        const price = getValue<number | null>();
        return price ? <span className="font-medium">S/ {price.toFixed(2)}</span> : <span className="text-muted-foreground">-</span>;
      },
    },
    { accessorKey: "operator", header: "Operador" },
    {
      id: "actions",
      header: "Acciones",
      cell: ({ row }) => {
        const mv = row.original;
        return (
          <div className="flex gap-2">
            {mv.type !== "ADJUSTMENT" && (
              <Button size="sm" variant="secondary" onClick={() => onEdit(mv)}>
                ✏️
              </Button>
            )}
            {mv.type !== "ADJUSTMENT" && (
              <Button size="sm" variant="destructive" onClick={() => onDelete(mv)}>
                🗑
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return <DataTable columns={columns} data={data} />;
}
