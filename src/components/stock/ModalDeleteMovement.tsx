// src/components/stock/ModalDeleteMovement.tsx
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
  AlertDialogOverlay,
  AlertDialogPortal,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { deleteMovement } from "@/app/(protected)/stock-movements/actions";
import { useTransition } from "react";
import { toast } from "sonner";

interface Props {
  movement: {
    id:        number;
    eppCode:   string;
    eppName:   string;
    warehouse: string;
    type:      "ENTRY" | "EXIT";
    quantity:  number;
  };
  onClose: () => void;
}

export default function ModalDeleteMovement({ movement, onClose }: Props) {
  const [isPending, start] = useTransition();

  return (
    <AlertDialog open onOpenChange={onClose}>
      <AlertDialogPortal>
        <AlertDialogOverlay className="fixed inset-0 bg-black/50 z-40" />
        <AlertDialogContent className="fixed z-50 left-1/2 top-1/2 w-[90vw] max-w-md 
                                       -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white 
                                       p-6 shadow-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar movimiento?</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a borrar el movimiento de stock:<br/>
              <strong>EPP:</strong> {movement.eppCode} – {movement.eppName}<br/>
              <strong>Almacén:</strong> {movement.warehouse}<br/>
              <strong>Tipo:</strong> {movement.type === "ENTRY" ? "Entrada" : "Salida"}<br/>
              <strong>Cantidad:</strong> {movement.quantity}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex justify-end gap-4">
            <AlertDialogCancel asChild>
              <Button variant="outline">Cancelar</Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                variant="destructive"
                disabled={isPending}
                onClick={() =>
                  start(async () => {
                    try {
                      await deleteMovement(movement.id);
                      toast.success("Movimiento eliminado");
                      onClose();
                    } catch (err: unknown) {
                      toast.error(err instanceof Error ? err.message : "Error al eliminar");
                    }
                  })
                }
              >
                Eliminar
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogPortal>
    </AlertDialog>
  );
}
