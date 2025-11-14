"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { User, Mail, Briefcase, MapPin, IdCard, Loader2 } from "lucide-react";
import { updateCollaborator } from "@/app/(protected)/collaborators/actions";
import { collaboratorSchema, CollaboratorValues } from "@/schemas/collaborator-schema";

export default function ModalEditCollaborator({
  collaborator,
  onClose,
}: {
  collaborator: { id: number; name: string; email: string | null; position: string | null; location: string | null; documentId: string | null };
  onClose:      () => void;
}) {
  const { register, handleSubmit, formState: { errors, isSubmitting, isValid } } =
    useForm<CollaboratorValues>({
      resolver: zodResolver(collaboratorSchema),
      defaultValues: {
        id:         collaborator.id,
        name:       collaborator.name,
        email:      collaborator.email ?? undefined,
        position:   collaborator.position ?? undefined,
        location:   collaborator.location ?? undefined,
        documentId: collaborator.documentId ?? undefined,
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Editar Colaborador
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* ID oculto */}
          <input type="hidden" {...register("id")} />

          {/* Información Personal */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground">Información Personal</h3>
            <div className="space-y-3">
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  {...register("name")}
                  placeholder="Nombre completo"
                  className="pl-9"
                  aria-label="Nombre"
                />
                {errors.name && <p className="text-destructive text-xs mt-1">{errors.name.message}</p>}
              </div>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  {...register("email")}
                  placeholder="correo@ejemplo.com"
                  className="pl-9"
                  aria-label="Email"
                />
                {errors.email && <p className="text-destructive text-xs mt-1">{errors.email.message}</p>}
              </div>
              <div className="relative">
                <IdCard className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  {...register("documentId")}
                  placeholder="DNI o Carnet de Extranjería"
                  maxLength={20}
                  className="pl-9"
                  aria-label="DNI"
                />
                {errors.documentId && <p className="text-destructive text-xs mt-1">{errors.documentId.message}</p>}
              </div>
            </div>
          </div>

          {/* Información Laboral */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground">Información Laboral</h3>
            <div className="space-y-3">
              <div className="relative">
                <Briefcase className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  {...register("position")}
                  placeholder="Cargo o posición"
                  className="pl-9"
                  aria-label="Posición"
                />
                {errors.position && <p className="text-destructive text-xs mt-1">{errors.position.message}</p>}
              </div>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  {...register("location")}
                  placeholder="Ubicación o sucursal"
                  className="pl-9"
                  aria-label="Ubicación"
                />
                {errors.location && <p className="text-destructive text-xs mt-1">{errors.location.message}</p>}
              </div>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" type="button" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!isValid || isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Guardar Cambios"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
