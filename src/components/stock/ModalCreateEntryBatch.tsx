"use client";

import { useFieldArray, useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input }  from "@/components/ui/input";
import { Label }  from "@/components/ui/label";
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b pb-4">
          <div>
            <DialogTitle className="text-2xl font-bold">Entrada rápida de productos</DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">Registra múltiples productos en un mismo almacén</p>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(submit)} className="space-y-6">
          {/* SECCIÓN 1: ALMACÉN DESTINO */}
          <div className="bg-gradient-to-r from-blue-50 to-transparent p-4 rounded-lg border border-blue-100">
            <h3 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-200 text-blue-900 text-xs font-bold">1</span>
              Selecciona el almacén destino
            </h3>
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
              <p className="text-destructive text-sm mt-2 flex items-center gap-1">⚠️ {errors.warehouseId.message}</p>
            )}
          </div>

          {/* SECCIÓN 2: PRODUCTOS */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 text-slate-900 text-xs font-bold">2</span>
              Añade los productos
            </h3>
            <div className="space-y-2">
              {fields.map((f, idx) => (
                <div key={f.id} className="grid grid-cols-12 gap-3 items-end p-4 border border-slate-200 rounded-lg bg-white hover:border-blue-200 hover:shadow-sm transition-all">
                  <div className="col-span-5">
                    <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5 block">Producto</Label>
                    <Controller
                      name={`items.${idx}.eppId`}
                      control={control}
                      render={({ field }) => (
                        <ComboboxEpp value={field.value} onChange={field.onChange} />
                      )}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5 block">Cantidad</Label>
                    <Input
                      type="number"
                      min={1}
                      {...register(`items.${idx}.quantity`, { valueAsNumber: true })}
                      className="focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                  </div>
                  <div className="col-span-3">
                    <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5 block">Precio unitario</Label>
                    <Input
                      type="number"
                      step={0.01}
                      min={0}
                      placeholder="0.00"
                      {...register(`items.${idx}.unitPrice`, { valueAsNumber: true })}
                      className="focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                    />
                  </div>
                  <div className="col-span-2 flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(idx)}
                      className="hover:bg-red-50 hover:text-red-600 transition-colors"
                      title="Eliminar producto"
                    >
                      <Trash size={16} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <Button
              variant="outline"
              type="button"
              onClick={() => append({ eppId: undefined!, quantity: 1, unitPrice: undefined })}
              className="w-full border-dashed border-2 border-blue-300 hover:border-blue-500 hover:bg-blue-50 text-blue-600 hover:text-blue-700 transition-colors py-2 h-auto"
            >
              <Plus size={18} className="mr-2" /> Añadir otro producto
            </Button>

            {errors.items && (
              <p className="text-destructive text-sm p-2 bg-red-50 rounded border border-red-200">⚠️ {errors.items.message}</p>
            )}
          </div>

          {/* SECCIÓN 3: INFORMACIÓN ADICIONAL */}
          <div className="border-t pt-4 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 text-slate-900 text-xs font-bold">3</span>
              Información adicional (opcional)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Orden de Compra</Label>
                <Input 
                  {...register("purchaseOrder")} 
                  placeholder="Ej: OC-2026-001"
                  className="focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                />
                <p className="text-xs text-muted-foreground">Para trazabilidad de compras</p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Nota</Label>
                <Input 
                  {...register("note")} 
                  placeholder="Ej: Compra urgente, revisión especial..."
                  className="focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
                <p className="text-xs text-muted-foreground">Información relevante sobre la entrada</p>
              </div>
            </div>
          </div>

          {/* ACCIONES */}
          <div className="flex justify-end gap-3 pt-6 border-t">
            <Button 
              variant="outline" 
              type="button" 
              onClick={onClose} 
              disabled={isSubmitting}
              className="px-6"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={!isValid || isSubmitting}
              className="px-8 bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting && <Loader2 className="animate-spin h-4 w-4 mr-2" />}
              {isSubmitting ? "Guardando..." : "Guardar entrada"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
