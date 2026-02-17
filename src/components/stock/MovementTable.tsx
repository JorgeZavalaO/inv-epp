"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge }  from "@/components/ui/badge";
import { DataTable } from "@/components/ui/DataTable";
import { AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface Row {
  /* columnas visibles */
  id: number;
  date: string;
  eppCode: string;
  eppName: string;
  warehouse: string;
  quantity: number;
  type: "ENTRY" | "EXIT" | "ADJUSTMENT" | "TRANSFER_IN" | "TRANSFER_OUT";
  operator: string;
  unitPrice?: number | null;
  purchaseOrder?: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejectionNote?: string | null;

  /* necesarios para los modales */
  eppId: number;
  warehouseId: number;
  note?: string | null;
  isCancellation?: boolean;
  cancellationReason?: string | null;
}

interface Props {
  data: Row[];
  onEdit:   (row: Row) => void;
  onDelete: (row: Row) => void;
}

function StatusBadge({ status }: { status: Row["status"] }) {
  switch (status) {
    case "PENDING":
      return (
        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 flex items-center gap-1 w-fit">
          <Clock className="h-3 w-3" />
          Pendiente
        </Badge>
      );
    case "APPROVED":
      return (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-100 flex items-center gap-1 w-fit">
          <CheckCircle2 className="h-3 w-3" />
          Aprobado
        </Badge>
      );
    case "REJECTED":
      return (
        <Badge className="bg-red-100 text-red-800 hover:bg-red-100 flex items-center gap-1 w-fit">
          <AlertCircle className="h-3 w-3" />
          Rechazado
        </Badge>
      );
  }
}

export default function MovementTable({ data, onEdit, onDelete }: Props) {
  const [rejectionDetail, setRejectionDetail] = useState<{ movementId: number; note: string } | null>(null);
  const typeBadge = (t: Row["type"]) => (
    <Badge variant={t === "ENTRY" || t === "TRANSFER_IN" ? "default" : t === "EXIT" || t === "TRANSFER_OUT" ? "destructive" : "secondary"}>
      {t === "ENTRY"
        ? "Entrada"
        : t === "EXIT"
        ? "Salida"
        : t === "TRANSFER_IN"
        ? "Traslado Entrada"
        : t === "TRANSFER_OUT"
        ? "Traslado Salida"
        : "Ajuste"}
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
          type === "ENTRY" || type === "TRANSFER_IN"
            ? "text-green-600"
            : type === "EXIT" || type === "TRANSFER_OUT"
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
      id: "cancellation",
      header: "Origen",
      cell: ({ row }) => {
        const { note } = row.original;
        // Detectar ambos formatos:
        // Nuevo: [ANULACIÓN] DEL-XXXX → DEV-YYYY | Razón: {motivo}
        // Anterior: Anulación entrega DEL-XXXX → Devolución DEV-XXXX
        if (note && (note.includes("[ANULACIÓN]") || note.startsWith("Anulación entrega"))) {
          let reason = "Anulación de entrega";
          
          // Si tiene el formato nuevo, extraer la razón
          if (note.includes("[ANULACIÓN]")) {
            const reasonMatch = note.match(/Razón: (.+?)(?:\s*→|$)/);
            if (reasonMatch) {
              reason = reasonMatch[1].trim();
            }
          } else if (note.startsWith("Anulación entrega")) {
            // Para el formato anterior, mostrar información de las entregas
            reason = note;
          }
          
          return (
            <div className="flex items-center gap-2">
              <Badge className="bg-red-100 text-red-800 hover:bg-red-100 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Anulación
              </Badge>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 hover:bg-red-100"
                onClick={() =>
                  setRejectionDetail({
                    movementId: row.original.id,
                    note: reason,
                  })
                }
                title="Ver razón de la anulación"
              >
                ℹ️
              </Button>
            </div>
          );
        }
        return <span className="text-muted-foreground">-</span>;
      },
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
      accessorKey: "status",
      header: "Estado",
      cell: ({ row }) => {
        const mv = row.original;
        return (
          <div className="flex items-center gap-2">
            <StatusBadge status={mv.status} />
            {mv.status === "REJECTED" && mv.rejectionNote && (
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 hover:bg-red-100"
                onClick={() =>
                  setRejectionDetail({
                    movementId: mv.id,
                    note: mv.rejectionNote!,
                  })
                }
                title="Ver razón del rechazo"
              >
                ℹ️
              </Button>
            )}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "Acciones",
      cell: ({ row }) => {
        const mv = row.original;
        // Solo permitir edición/eliminación si está pendiente o aprobado
        const canModify = mv.status !== "REJECTED";
        const canEditOrDelete = (mv.type === "ENTRY" || mv.type === "EXIT") && canModify;
        return (
          <div className="flex gap-2">
            {canEditOrDelete && (
              <Button size="sm" variant="secondary" onClick={() => onEdit(mv)}>
                ✏️
              </Button>
            )}
            {canEditOrDelete && (
              <Button size="sm" variant="destructive" onClick={() => onDelete(mv)}>
                🗑
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <>
      <DataTable columns={columns} data={data} />

      {/* Modal para ver razón de rechazo */}
      {rejectionDetail && (
        <Dialog open={!!rejectionDetail} onOpenChange={() => setRejectionDetail(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                Razón del Rechazo
              </DialogTitle>
              <DialogDescription>
                Movimiento ID: {rejectionDetail.movementId}
              </DialogDescription>
            </DialogHeader>
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-sm text-red-900 whitespace-pre-wrap">
                {rejectionDetail.note}
              </p>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
