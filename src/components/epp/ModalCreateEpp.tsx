"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button }       from "@/components/ui/button";
import { Input }        from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver }  from "@hookform/resolvers/zod";
import { toast }        from "sonner";
import { Loader2 } from "lucide-react";

import { eppSchema, EppValues } from "@/schemas/epp-schema";
import { createEpp }    from "@/app/(protected)/epps/actions";
import { getNextEppCode } from "@/lib/next-epp-code";

export default function ModalCreateEpp({ onClose }: { onClose(): void }) {
  const [autoCode, setAutoCode] = React.useState("");

  // Cargar código autogenerado
  React.useEffect(() => {
    getNextEppCode().then(setAutoCode).catch(() => {});
  }, []);

  const { register, handleSubmit, formState } = useForm<EppValues>({
    resolver:    zodResolver(eppSchema),
    mode:        "onChange",
    defaultValues: {
      code:        autoCode,
      name:        "",
      category:    "",
      subcategory: "",
      description: "",
      minStock:    1,
    },
  });

  const onSubmit = async (data: EppValues) => {
    // Serializar FormData (sin items, ya que el stock inicial es 0 en todos los almacenes)
    const fd = new FormData();
    Object.entries({ ...data, code: autoCode }).forEach(([key, val]) => {
      fd.append(key, String(val ?? ""));
    });

    try {
      await createEpp(fd);
      toast.success("EPP creado correctamente");
      onClose();
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Error al crear EPP";
      toast.error(errorMessage);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar nuevo EPP</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
          {/* Código (autogenerado) */}
          <Input disabled value={autoCode} label="Código" />

          {/* Nombre, categoría, descripción, minStock */}
          <Input {...register("name")} label="Nombre" />
          {formState.errors.name && (
            <p className="text-destructive text-sm">{formState.errors.name.message}</p>
          )}

          <Input {...register("category")} label="Categoría" />
          {formState.errors.category && (
            <p className="text-destructive text-sm">{formState.errors.category.message}</p>
          )}

          <Input {...register("subcategory")} label="Subcategoría (opcional)" />
          {formState.errors.subcategory && (
            <p className="text-destructive text-sm">{formState.errors.subcategory.message}</p>
          )}

          <Input {...register("description")} label="Descripción" />

          <Input
            type="number"
            {...register("minStock", { valueAsNumber: true })}
            label="Stock mínimo"
          />
          {formState.errors.minStock && (
            <p className="text-destructive text-sm">{formState.errors.minStock.message}</p>
          )}

          {/* Información sobre stocks iniciales */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <p className="text-sm text-blue-800">
              <strong>Nota:</strong> El stock inicial será automáticamente 0 en todos los almacenes.
              Esto asegura consistencia en el control de inventarios.
            </p>
          </div>

          {/* Acciones */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose} disabled={formState.isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!formState.isValid || formState.isSubmitting}>
              {formState.isSubmitting && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
              Crear
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
