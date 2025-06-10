"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { createCollaborator } from "@/app/(protected)/collaborators/actions";
import { collaboratorSchema, CollaboratorValues } from "@/schemas/collaborator-schema";

export default function ModalCreateCollaborator({ onClose }: { onClose: () => void }) {
  const { register, handleSubmit, formState: { errors, isSubmitting, isValid } } =
    useForm<CollaboratorValues>({
      resolver: zodResolver(collaboratorSchema.omit({ id: true })),
      mode: "onChange",
    });

  const onSubmit = async (data: CollaboratorValues) => {
    try {
      const fd = new FormData();
      Object.entries(data).forEach(([k, v]) => v !== undefined && fd.append(k, String(v)));
      await createCollaborator(fd);
      toast.success("Colaborador creado");
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo Colaborador</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
              Crear
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
