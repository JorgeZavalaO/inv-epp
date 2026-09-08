"use client";

import * as React from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { deleteMovement } from "@/app/(protected)/stock-movements/actions";
import { AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  movement: {
    id: number;
    eppCode: string;
    eppName: string;
    warehouse: string;
    type: "ENTRY" | "EXIT";
    quantity: number;
  };
  onClose: () => void;
}

export default function ModalDeleteMovement({ movement, onClose }: Props) {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);

  const handleDelete = async () => {
    setDeleteError(null);
    setIsDeleting(true);
    try {
      await deleteMovement(movement.id);
      toast.success("Movimiento eliminado");
      onClose();
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : "Error al eliminar el movimiento");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open onOpenChange={(open) => { if (!open && !isDeleting) onClose(); }}>
      <AlertDialogContent className="max-w-[calc(100%-2rem)] rounded-xl p-5 sm:max-w-md sm:p-6">
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar movimiento?</AlertDialogTitle>
          <AlertDialogDescription>
            Vas a borrar el movimiento de stock:
            <span className="mt-3 block space-y-1">
              <span className="block"><strong>EPP:</strong> {movement.eppCode} – {movement.eppName}</span>
              <span className="block"><strong>Almacén:</strong> {movement.warehouse}</span>
              <span className="block"><strong>Tipo:</strong> {movement.type === "ENTRY" ? "Entrada" : "Salida"}</span>
              <span className="block"><strong>Cantidad:</strong> {movement.quantity}</span>
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>

        {deleteError && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-800" role="alert">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>{deleteError}</span>
          </div>
        )}

        <AlertDialogFooter className="flex-col-reverse gap-3 sm:flex-row">
          <AlertDialogCancel asChild>
            <Button variant="outline" disabled={isDeleting} className="min-h-11">Cancelar</Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              variant="destructive"
              disabled={isDeleting}
              aria-busy={isDeleting}
              onClick={(event) => {
                event.preventDefault();
                void handleDelete();
              }}
              className="min-h-11"
            >
              {isDeleting && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />}
              {isDeleting ? "Eliminando..." : deleteError ? "Reintentar" : "Eliminar"}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
