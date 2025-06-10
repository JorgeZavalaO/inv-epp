"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { updateCollaborator } from "@/app/(protected)/collaborators/actions";
import { collaboratorSchema, CollaboratorValues } from "@/schemas/collaborator-schema";

export default function ModalEditCollaborator({
  collaborator,
  onClose,
}: {
  collaborator: { id: number; name: string; email: string | null; position: string | null };
  onClose:      () => void;
}) {
  const { register, handleSubmit, formState: { errors, isSubmitting, isValid } } =
    useForm<CollaboratorValues>({
      resolver: zodResolver(collaboratorSchema),
      defaultValues: {
        id:       collaborator.id,
        name:     collaborator.name,
        email:    collaborator.email ?? undefined,
        position: collaborator.position ?? undefined,
      },
      mode: "onChange",
    });

  const onSubmit = async (data: CollaboratorValues) => {
    try {
      const fd = new FormData();
      Object.entries(data).forEach(([k, v]) => v !== undefined && fd.append(k, String(v)));
      await updateCollaborator(fd);
      toast.success("Colaborador actualizado");
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Colaborador</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* ID oculto */}
          <input type="hidden" {...register("id")} />
          <div>
            <Label>Nombre</Label>
            <Input {...register("name")} />
            {errors.name && <p className="text-destructive text-sm">{errors.name.message}</p>}
          </div>
          <div>
            <Label>Email (opcional)</Label>
            <Input type="email" {...register("email")} />
            {errors.email && <p className="text-destructive text-sm">{errors.email.message}</p>}
          </div>
          <div>
            <Label>Posición (opcional)</Label>
            <Input {...register("position")} />
            {errors.position && <p className="text-destructive text-sm">{errors.position.message}</p>}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!isValid || isSubmitting}>
              Guardar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
