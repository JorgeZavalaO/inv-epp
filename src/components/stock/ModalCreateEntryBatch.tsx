"use client";

import { useFieldArray, useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ComboboxEpp from "@/components/ui/ComboboxEpp";
import ComboboxWarehouse from "@/components/ui/ComboboxWarehouse";
import { entryBatchSchema, EntryBatchValues } from "@/schemas/entry-batch-schema";
import { createEntryBatch } from "@/app/(protected)/stock-movements/actions-entry";
import { AlertCircle, Plus, Trash, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function ModalCreateEntryBatch({ onClose }: { onClose(): void }) {
  const router = useRouter();
  const [warehouses, setWarehouses] = useState<{ id: number; label: string }[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/warehouses")
      .then((r) => r.json())
      .then((arr: { id: number; name: string }[]) => setWarehouses(arr.map((w) => ({ id: w.id, label: w.name }))))
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
      purchaseOrder: "",
      items: [{ eppId: undefined!, quantity: 1, unitPrice: undefined }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  const submit = async (data: EntryBatchValues) => {
    setSubmitError(null);
    const fd = new FormData();
    fd.append("warehouseId", String(data.warehouseId));
    fd.append("note", data.note ?? "");
    fd.append("purchaseOrder", data.purchaseOrder ?? "");

    data.items.forEach((item, index) => {
      fd.append(`items.${index}.eppId`, String(item.eppId));
      fd.append(`items.${index}.quantity`, String(item.quantity));
      if (item.unitPrice !== undefined && !Number.isNaN(item.unitPrice)) {
        fd.append(`items.${index}.unitPrice`, String(item.unitPrice));
      }
    });

    try {
      const result = await createEntryBatch(fd);
      if (!result.success) {
        setSubmitError(result.message);
        return;
      }

      if (result.requiresApproval) {
        toast.warning(result.message || "Entrada múltiple creada. Pendiente de aprobación.", { duration: 5000 });
      } else {
        toast.success(result.message || "Entrada múltiple registrada exitosamente");
      }

      onClose();
      router.refresh();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Error al guardar la entrada múltiple");
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && !isSubmitting) onClose();
  };

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-4xl">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="text-xl font-bold sm:text-2xl">Entrada rápida de productos</DialogTitle>
          <DialogDescription>Registra múltiples productos en un mismo almacén.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(submit)} className="space-y-6">
          <div className="rounded-lg border border-blue-100 bg-gradient-to-r from-blue-50 to-transparent p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-blue-900">
              <span className="flex size-7 items-center justify-center rounded-full bg-blue-200 text-xs font-bold text-blue-900">1</span>
              Selecciona el almacén destino
            </h3>
            <Label htmlFor="entry-batch-warehouse" className="sr-only">Almacén destino</Label>
            <Controller
              name="warehouseId"
              control={control}
              render={({ field }) => (
                <ComboboxWarehouse
                  id="entry-batch-warehouse"
                  value={field.value ?? null}
                  onChange={field.onChange}
                  options={warehouses}
                  className="min-h-11"
                  aria-invalid={Boolean(errors.warehouseId)}
                  aria-describedby={errors.warehouseId ? "entry-batch-warehouse-error" : undefined}
                />
              )}
            />
            {errors.warehouseId && <p id="entry-batch-warehouse-error" className="mt-2 text-sm text-destructive" role="alert">⚠️ {errors.warehouseId.message}</p>}
          </div>

          <div className="space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <span className="flex size-7 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-900">2</span>
              Añade los productos
            </h3>
            <div className="space-y-3">
              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-1 items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-12">
                  <div className="space-y-2 sm:col-span-5">
                    <Label htmlFor={`entry-batch-epp-${index}`}>Producto {index + 1}</Label>
                    <Controller
                      name={`items.${index}.eppId`}
                      control={control}
                      render={({ field: itemField }) => (
                        <ComboboxEpp
                          id={`entry-batch-epp-${index}`}
                          value={itemField.value ?? null}
                          onChange={itemField.onChange}
                          className="min-h-11"
                          aria-invalid={Boolean(errors.items?.[index]?.eppId)}
                          aria-describedby={errors.items?.[index]?.eppId ? `entry-batch-epp-${index}-error` : undefined}
                        />
                      )}
                    />
                    {errors.items?.[index]?.eppId && <p id={`entry-batch-epp-${index}-error`} className="text-sm text-destructive" role="alert">⚠️ {errors.items[index]?.eppId?.message}</p>}
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor={`entry-batch-quantity-${index}`}>Cantidad</Label>
                    <Input
                      id={`entry-batch-quantity-${index}`}
                      type="number"
                      min={1}
                      step={1}
                      {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                      aria-invalid={Boolean(errors.items?.[index]?.quantity)}
                      aria-describedby={errors.items?.[index]?.quantity ? `entry-batch-quantity-${index}-error` : undefined}
                      className="h-11 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {errors.items?.[index]?.quantity && <p id={`entry-batch-quantity-${index}-error`} className="text-sm text-destructive" role="alert">⚠️ {errors.items[index]?.quantity?.message}</p>}
                  </div>
                  <div className="space-y-2 sm:col-span-3">
                    <Label htmlFor={`entry-batch-unit-price-${index}`}>Precio unitario (opcional)</Label>
                    <Input
                      id={`entry-batch-unit-price-${index}`}
                      type="number"
                      step={0.01}
                      min={0}
                      placeholder="0.00"
                      {...register(`items.${index}.unitPrice`, { valueAsNumber: true })}
                      aria-invalid={Boolean(errors.items?.[index]?.unitPrice)}
                      aria-describedby={errors.items?.[index]?.unitPrice ? `entry-batch-unit-price-${index}-error` : undefined}
                      className="h-11 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                    {errors.items?.[index]?.unitPrice && <p id={`entry-batch-unit-price-${index}-error`} className="text-sm text-destructive" role="alert">⚠️ {errors.items[index]?.unitPrice?.message}</p>}
                  </div>
                  <div className="flex items-end justify-start sm:col-span-2 sm:justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={fields.length === 1 || isSubmitting}
                      onClick={() => remove(index)}
                      className="min-h-11 min-w-11 hover:bg-red-50 hover:text-red-600"
                      aria-label={`Eliminar producto ${index + 1}`}
                      title="Eliminar producto"
                    >
                      <Trash size={18} aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <Button
              variant="outline"
              type="button"
              onClick={() => append({ eppId: undefined!, quantity: 1, unitPrice: undefined })}
              disabled={isSubmitting}
              className="min-h-11 w-full border-2 border-dashed border-blue-300 py-2 text-blue-600 hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700"
            >
              <Plus size={18} className="mr-2" aria-hidden="true" /> Añadir otro producto
            </Button>

            {errors.items?.message && <p className="rounded border border-red-200 bg-red-50 p-2 text-sm text-destructive" role="alert">⚠️ {errors.items.message}</p>}
          </div>

          <div className="space-y-4 border-t pt-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <span className="flex size-7 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-900">3</span>
              Información adicional (opcional)
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="entry-batch-purchase-order">Orden de compra</Label>
                <Input id="entry-batch-purchase-order" {...register("purchaseOrder")} placeholder="Ej: OC-2026-001" className="h-11" />
                <p className="text-xs text-muted-foreground">Para trazabilidad de compras.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="entry-batch-note">Nota</Label>
                <Input id="entry-batch-note" {...register("note")} placeholder="Ej: Compra urgente, revisión especial..." className="h-11" />
                <p className="text-xs text-muted-foreground">Información relevante sobre la entrada.</p>
              </div>
            </div>
          </div>

          {submitError && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-800" role="alert">
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>{submitError}</span>
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 border-t pt-6 sm:flex-row sm:justify-end">
            <Button variant="outline" type="button" onClick={onClose} disabled={isSubmitting} className="min-h-11 px-6">Cancelar</Button>
            <Button type="submit" disabled={!isValid || isSubmitting} aria-busy={isSubmitting} className="min-h-11 bg-blue-600 px-8 hover:bg-blue-700">
              {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />}
              {isSubmitting ? "Guardando entrada..." : submitError ? "Reintentar" : "Guardar entrada"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
