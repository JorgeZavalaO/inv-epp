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
import { setCollaboratorStatus } from "@/app/(protected)/collaborators/actions";
import type { CollaboratorStatusValue } from "@/schemas/collaborator-schema";
import { useTransition } from "react";
import { toast } from "sonner";

export default function ModalChangeCollaboratorStatus({
  collaborator,
  onClose,
}: {
  collaborator: { id: number; name: string; status: CollaboratorStatusValue };
  onClose: () => void;
}) {
  const [isPending, start] = useTransition();
  const nextStatus: CollaboratorStatusValue =
    collaborator.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
  const deactivating = nextStatus === "INACTIVE";

  return (
    <AlertDialog open onOpenChange={onClose}>
      <AlertDialogPortal>
        <AlertDialogOverlay className="fixed inset-0 bg-black/50 z-40" />
        <AlertDialogContent className="fixed z-50 left-1/2 top-1/2 w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-6 shadow-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deactivating ? "Dar de baja colaborador" : "Reactivar colaborador"}
            </AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription>
            {deactivating ? (
              <>
                ¿Seguro que deseas dar de baja a “{collaborator.name}”? No podrá recibir nuevas
                entregas de EPP mientras permanezca inactivo.
              </>
            ) : (
              <>
                ¿Seguro que deseas reactivar a “{collaborator.name}”? Volverá a estar disponible
                para recibir entregas de EPP.
              </>
            )}
          </AlertDialogDescription>
          <AlertDialogFooter className="flex justify-end gap-4">
            <AlertDialogCancel asChild>
              <Button variant="outline">Cancelar</Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                variant={deactivating ? "destructive" : "default"}
                disabled={isPending}
                onClick={() =>
                  start(async () => {
                    try {
                      await setCollaboratorStatus(collaborator.id, nextStatus);
                      toast.success(
                        deactivating
                          ? "Colaborador dado de baja"
                          : "Colaborador reactivado",
                      );
                      onClose();
                    } catch (err: unknown) {
                      const msg = err instanceof Error ? err.message : "Error";
                      toast.error(msg);
                    }
                  })
                }
              >
                {deactivating ? "Dar de baja" : "Reactivar"}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogPortal>
    </AlertDialog>
  );
}
