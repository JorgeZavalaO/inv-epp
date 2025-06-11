"use client";

import {
  AlertDialog,
  AlertDialogTrigger,
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

export default function ModalDeleteDeliveryBatch({ batch, onClose }: { batch: { id: number; code: string }; onClose(): void }) {
  const [isPending, startTransition] = useTransition();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" disabled={isPending}>Eliminar entrega {batch.code}</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar entrega {batch.code}?</AlertDialogTitle>
        </AlertDialogHeader>
        <p className="mt-2 text-sm text-muted-foreground">
          Al confirmar, se devolverá el stock y se eliminará todo el lote.
        </p>
        <AlertDialogFooter className="flex justify-end gap-2 pt-4">
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={() =>
            startTransition(async () => {
              await deleteBatch(batch.id);
              toast.success("Entrega eliminada");
              onClose();
            })
          } disabled={isPending}>
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
