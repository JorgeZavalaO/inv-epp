"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button }       from "@/components/ui/button";
import { Label }        from "@/components/ui/label";
import { Input }        from "@/components/ui/input";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver }  from "@hookform/resolvers/zod";
import { toast }        from "sonner";
import { Plus, Trash, Loader2 } from "lucide-react";

import { eppSchema, EppValues } from "@/schemas/epp-schema";
import { createEpp }    from "@/app/(protected)/epps/actions";
import { getNextEppCode } from "@/lib/next-epp-code";
import ComboboxWarehouse from "@/components/ui/ComboboxWarehouse";

export default function ModalCreateEpp({ onClose }: { onClose(): void }) {
  const [autoCode, setAutoCode] = React.useState("");
  const [warehouses, setWarehouses] = React.useState<{ id: number; name: string }[]>([]);

  // Cargar código y lista de almacenes
  React.useEffect(() => {
    getNextEppCode().then(setAutoCode).catch(() => {});
    fetch("/api/warehouses")
      .then((r) => r.json())
      .then(setWarehouses)
      .catch(() => {});
  }, []);

  const { control, register, handleSubmit, formState } = useForm<EppValues>({
    resolver:    zodResolver(eppSchema),
    mode:        "onChange",
    defaultValues: {
      code:        autoCode,
      name:        "",
      category:    "",
      description: "",
      minStock:    1,
      items: [
        { warehouseId: undefined!, initialQty: 0 },
        { warehouseId: undefined!, initialQty: 0 },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const onSubmit = async (data: EppValues) => {
    // Serializar FormData (incluye items[])
    const fd = new FormData();
    Object.entries({ ...data, code: autoCode }).forEach(([key, val]) => {
      if (key === "items" && Array.isArray(val)) {
        val.forEach((it, i) => {
          fd.append(`items.${i}.warehouseId`, String(it.warehouseId));
          fd.append(`items.${i}.initialQty`, String(it.initialQty));
        });
      } else {
        fd.append(key, String(val ?? ""));
      }
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

          <Input {...register("description")} label="Descripción" />

          <Input
            type="number"
            {...register("minStock", { valueAsNumber: true })}
            label="Stock mínimo"
          />
          {formState.errors.minStock && (
            <p className="text-destructive text-sm">{formState.errors.minStock.message}</p>
          )}

          {/* Sección de stocks iniciales */}
          <Label>Stocks iniciales (por almacén)</Label>
          {fields.map((f, idx) => (
            <div key={f.id} className="grid grid-cols-12 gap-2 items-end">
              {/* Selección de almacén */}
              <Controller
                name={`items.${idx}.warehouseId`}
                control={control}
                render={({ field }) => (
                  <div className="col-span-6">
                    <ComboboxWarehouse
                      value={field.value || null}
                      onChange={field.onChange}
                      options={warehouses.map((w) => ({ id: w.id, label: w.name }))}
                    />
                  </div>
                )}
              />
              {/* Cantidad inicial */}
              <Controller
                name={`items.${idx}.initialQty`}
                control={control}
                render={({ field }) => (
                  <div className="col-span-4">
                    <Input
                      type="number"
                      min={0}
                      {...field}
                      placeholder="Cantidad"
                    />
                  </div>
                )}
              />
              {/* Botón eliminar fila */}
              <div className="col-span-2 flex justify-end">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => remove(idx)}
                >
                  <Trash size={16} />
                </Button>
              </div>
            </div>
          ))}
          {/* Botón añadir otro almacén */}
          <Button
            variant="outline"
            onClick={() => append({ warehouseId: undefined!, initialQty: 0 })}
          >
            <Plus size={16} className="mr-1" /> Añadir almacén
          </Button>
          {formState.errors.items && (
            <p className="text-destructive text-sm">{formState.errors.items.message}</p>
          )}

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
