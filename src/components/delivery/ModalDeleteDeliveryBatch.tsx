"use client";

import {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useTransition } from "react";
import { toast } from "sonner";
import { deleteBatch } from "@/app/(protected)/deliveries/actions";

export default function ModalDeleteDeliveryBatch({
  batch,
  onClose,
}: {
  batch: { id: number; code: string };
  onClose(): void;
}) {
  const [isPending, startTransition] = useTransition();

  const confirmDelete = () => {
    startTransition(async () => {
      await deleteBatch(batch.id);
      toast.success("Entrega eliminada");
      onClose();
    });
  };

  return (
    <AlertDialog open onOpenChange={onClose}>
      <AlertDialogPortal>
        <AlertDialogOverlay className="fixed inset-0 bg-black/50" />
        <AlertDialogContent className="fixed left-1/2 top-1/2 w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded shadow">
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar entrega {batch.code}</AlertDialogTitle>
          </AlertDialogHeader>
          <p className="mt-2 text-sm text-muted-foreground">
            Al confirmar, se devolverá el stock y se eliminará todo el lote.
          </p>
          <AlertDialogFooter className="flex justify-end gap-2 pt-4">
            <AlertDialogCancel asChild>
              <Button variant="outline">Cancelar</Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                variant="destructive"
                disabled={isPending}
                onClick={confirmDelete}
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