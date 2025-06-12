"use client";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useTransition } from "react";
import { deleteBatch } from "@/app/(protected)/deliveries/actions";

export default function ModalDeleteDeliveryBatch({
  open,
  onOpenChange,
  batch,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batch: { id: number; code: string };
  onConfirm: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  const confirmDelete = () => {
    startTransition(async () => {
      await deleteBatch(batch.id);
      onConfirm();
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar entrega {batch.code}?</AlertDialogTitle>
        </AlertDialogHeader>
        <p className="mt-2 text-sm text-muted-foreground">
          Al confirmar, se devolverá el stock y se eliminará todo el lote.
        </p>
        <AlertDialogFooter className="flex justify-end gap-2 pt-4">
          <AlertDialogCancel asChild>
            <Button variant="outline">Cancelar</Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button variant="destructive" onClick={confirmDelete} disabled={isPending}>
              Eliminar
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
