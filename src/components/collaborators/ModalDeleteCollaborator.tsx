"use client";

import * as React from "react";
import {
  AlertDialog,
  AlertDialogTrigger,
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
import { deleteCollaborator } from "@/app/(protected)/collaborators/actions";
import { useTransition } from "react";
import { toast } from "sonner";

export default function ModalDeleteCollaborator({
  collaborator,
  onClose,
}: {
  collaborator: { id: number; name: string };
  onClose:      () => void;
}) {
  const [isPending, start] = useTransition();

  return (
    <AlertDialog open onOpenChange={onClose}>
      <AlertDialogTrigger asChild><></></AlertDialogTrigger>
      <AlertDialogPortal>
        <AlertDialogOverlay className="fixed inset-0 bg-black/50 z-40" />
        <AlertDialogContent className="fixed z-50 left-1/2 top-1/2 w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-6 shadow-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Colaborador</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription>
            ¿Seguro que deseas eliminar a “{collaborator.name}”? Esta acción no se puede deshacer.
          </AlertDialogDescription>
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
                      await deleteCollaborator(collaborator.id);
                      toast.success("Colaborador eliminado");
                      onClose();
                    } catch (err: unknown) {
                      const msg = err instanceof Error ? err.message : "Error";
                      toast.error(msg);
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
