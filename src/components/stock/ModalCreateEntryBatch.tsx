"use client";

import { useFieldArray, useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input }  from "@/components/ui/input";
import { Label }  from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import ComboboxEpp from "@/components/ui/ComboboxEpp";
import ComboboxWarehouse from "@/components/ui/ComboboxWarehouse";
import { entryBatchSchema, EntryBatchValues } from "@/schemas/entry-batch-schema";
import { createEntryBatch } from "@/app/(protected)/stock-movements/actions-entry";
import { Plus, Trash, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function ModalCreateEntryBatch({ onClose }: { onClose(): void }) {
  const router = useRouter();
  const [warehouses, setWarehouses] = useState<{ id: number; label: string }[]>([]);

  /* cargar almacenes */
  useEffect(() => {
    fetch("/api/warehouses")
      .then((r) => r.json())
      .then((arr: { id: number; name: string }[]) =>
        setWarehouses(arr.map((w) => ({ id: w.id, label: w.name })))
      )
      .catch(() => setWarehouses([]));
  }, []);

  const {
    control,
    handleSubmit,
    register,
    formState: { isSubmitting, isValid, errors },
  } = useForm<EntryBatchValues>({
    resolver: zodResolver(entryBatchSchema),
    mode: "onChange",
    defaultValues: {
      warehouseId: undefined!,
      note: "",
      items: [{ eppId: undefined!, quantity: 1 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  const submit = async (data: EntryBatchValues) => {
    const fd = new FormData();
    fd.append("warehouseId", String(data.warehouseId));
    fd.append("note", data.note ?? "");

    data.items.forEach((it, i) => {
      fd.append(`items.${i}.eppId`, String(it.eppId));
      fd.append(`items.${i}.quantity`, String(it.quantity));
    });

    try {
      const result = await createEntryBatch(fd);
      
      // Verificar si el resultado indica que requiere aprobación
      if (result && 'requiresApproval' in result && result.requiresApproval) {
        toast.warning(result.message || "Entrada múltiple creada. Pendiente de aprobación.", {
          duration: 5000,
        });
      } else {
        toast.success(result?.message || "Entrada múltiple registrada exitosamente");
      }
      
      onClose();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Entrada rápida de productos</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(submit)} className="space-y-6">
          {/* ALMACÉN */}
          <div>
            <Label>Almacén destino</Label>
            <Controller
              name="warehouseId"
              control={control}
              render={({ field }) => (
                <ComboboxWarehouse
                  value={field.value ?? null}
                  onChange={field.onChange}
                  options={warehouses}
                />
              )}
            />
            {errors.warehouseId && (
              <p className="text-destructive text-sm">{errors.warehouseId.message}</p>
            )}
          </div>

          {/* ITEMS */}
          <div className="space-y-4">
            {fields.map((f, idx) => (
              <div key={f.id} className="grid grid-cols-12 gap-2 items-end">
                <Controller
                  name={`items.${idx}.eppId`}
                  control={control}
                  render={({ field }) => (
                    <div className="col-span-7">
                      <ComboboxEpp value={field.value} onChange={field.onChange} />
                    </div>
                  )}
                />
                <div className="col-span-3">
                  <Input
                    type="number"
                    min={1}
                    {...register(`items.${idx}.quantity`, { valueAsNumber: true })}
                  />
                </div>
                <div className="col-span-2 flex justify-end">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(idx)}
                  >
                    <Trash size={16} />
                  </Button>
                </div>
              </div>
            ))}

            <Button
              variant="outline"
              type="button"
              onClick={() => append({ eppId: undefined!, quantity: 1 })}
            >
              <Plus size={16} className="mr-1" /> Añadir producto
            </Button>

            {errors.items && (
              <p className="text-destructive text-sm">{errors.items.message}</p>
            )}
          </div>

          {/* NOTA */}
          <div>
            <Label>Nota</Label>
            <Textarea rows={3} {...register("note")} />
          </div>

          {/* ACCIONES */}
          <div className="flex justify-end gap-4 pt-4">
            <Button variant="outline" type="button" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!isValid || isSubmitting}>
              {isSubmitting && <Loader2 className="animate-spin h-4 w-4 mr-2" />}
              Guardar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
