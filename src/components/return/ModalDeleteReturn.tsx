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
import { useTransition }  from "react";
import { toast }          from "sonner";
import { deleteReturnBatch } from "@/app/(protected)/returns/actions";
import { ReturnBatchRow } from "./ReturnClient";

interface Props {
  batch: ReturnBatchRow;
  onClose(): void;
}

export default function ModalDeleteReturn({ batch, onClose }: Props) {
  const [isPending, start] = useTransition();

  return (
    <AlertDialog open>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Deshacer lote {batch.code}?</AlertDialogTitle>
        </AlertDialogHeader>
        <p className="mt-2 text-sm text-muted-foreground">
          Se revertirán los movimientos de stock de este lote.
        </p>

        <AlertDialogFooter className="flex justify-end gap-2 pt-4">
          <AlertDialogCancel onClick={onClose}>Cancelar</AlertDialogCancel>

          <AlertDialogAction
            disabled={isPending}
            onClick={() =>
              start(async () => {
                try {
                  await deleteReturnBatch(batch.id);
                  toast.success("Lote deshecho");
                  onClose();
                } catch (err) {
                  toast.error(
                    err instanceof Error ? err.message : "Error al deshacer"
                  );
                }
              })
            }
          >
            Deshacer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
