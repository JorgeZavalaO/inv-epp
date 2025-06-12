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
import { useTransition } from "react";
import { toast } from "sonner";
import { deleteReturn } from "@/app/(protected)/returns/actions";
import { ReturnRow } from "./ReturnClient";

interface Props {
  ret: ReturnRow;
  onClose(): void;
}

export default function ModalDeleteReturn({ ret, onClose }: Props) {
  const [isPending, start] = useTransition();

  return (
    <AlertDialog open>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Deshacer devolución #{ret.id}?</AlertDialogTitle>
        </AlertDialogHeader>
        <p className="mt-2 text-sm text-muted-foreground">
          Esto restará las existencias si la condición es “Reutilizable”.
        </p>
        <AlertDialogFooter className="flex justify-end gap-2 pt-4">
          <AlertDialogCancel onClick={onClose}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={() =>
              start(async () => {
                try {
                  await deleteReturn(ret.id);
                  toast.success("Devolución deshecha");
                  onClose();
                } catch (e: unknown) {
                  toast.error(e instanceof Error ? e.message : "Error al deshacer");
                }
              })
            }
            disabled={isPending}
          >
            Deshacer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
