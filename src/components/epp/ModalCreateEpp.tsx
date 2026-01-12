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
          <p className="text-sm text-muted-foreground mt-2">
            Completa los campos marcados con <span className="text-red-500 font-bold">*</span> para continuar
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
          {/* Código (autogenerado) */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Código <span className="text-gray-500 text-xs">(autogenerado)</span>
            </label>
            <Input disabled value={autoCode} />
          </div>

          {/* Nombre - OBLIGATORIO */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Nombre <span className="text-red-500 font-bold">*</span>
            </label>
            <Input {...register("name")} placeholder="Ej: Casco de seguridad rojo" />
            {formState.errors.name && (
              <p className="text-destructive text-sm flex items-center gap-1">⚠️ {formState.errors.name.message}</p>
            )}
          </div>

          {/* Categoría - OBLIGATORIO */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Categoría <span className="text-red-500 font-bold">*</span>
            </label>
            <Input {...register("category")} placeholder="Ej: Protección cabeza" />
            {formState.errors.category && (
              <p className="text-destructive text-sm flex items-center gap-1">⚠️ {formState.errors.category.message}</p>
            )}
          </div>

          {/* Subcategoría - OPCIONAL */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Subcategoría <span className="text-gray-500 text-xs">(opcional)</span>
            </label>
            <Input {...register("subcategory")} placeholder="Ej: Casco industrial" />
            {formState.errors.subcategory && (
              <p className="text-destructive text-sm flex items-center gap-1">⚠️ {formState.errors.subcategory.message}</p>
            )}
          </div>

          {/* Descripción - OPCIONAL */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Descripción <span className="text-gray-500 text-xs">(opcional)</span>
            </label>
            <Input {...register("description")} placeholder="Ej: Casco de seguridad con ventilación..." />
            {formState.errors.description && (
              <p className="text-destructive text-sm flex items-center gap-1">⚠️ {formState.errors.description.message}</p>
            )}
          </div>

          {/* Stock Mínimo - OBLIGATORIO */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Stock mínimo <span className="text-red-500 font-bold">*</span>
            </label>
            <Input
              type="number"
              {...register("minStock", { valueAsNumber: true })}
              placeholder="Ej: 10"
            />
            {formState.errors.minStock && (
              <p className="text-destructive text-sm flex items-center gap-1">⚠️ {formState.errors.minStock.message}</p>
            )}
          </div>

          {/* Información sobre stocks iniciales */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3 space-y-2">
            <p className="text-sm font-medium text-blue-900">📝 Nota sobre stock inicial</p>
            <p className="text-sm text-blue-800">
              El stock inicial será automáticamente <strong>0 en todos los almacenes</strong>. 
              Esto asegura consistencia en el control de inventarios.
            </p>
            <p className="text-xs text-blue-700">
              Puedes agregar stock más adelante mediante movimientos de entrada.
            </p>
          </div>

          {/* Acciones */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={formState.isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!formState.isValid || formState.isSubmitting}>
              {formState.isSubmitting && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
              {formState.isSubmitting ? "Creando..." : "Crear EPP"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
