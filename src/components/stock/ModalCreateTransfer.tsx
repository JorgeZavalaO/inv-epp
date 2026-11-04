"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { transferBatchSchema, TransferBatchValues } from "@/schemas/transfer-schema";
import { createTransfer } from "@/app/(protected)/stock-movements/actions";
import ComboboxEpp from "@/components/ui/ComboboxEpp";
import ComboboxWarehouse from "@/components/ui/ComboboxWarehouse";

type Props = {
  onClose: () => void;
};

export default function ModalCreateTransfer({ onClose }: Props) {
  const router = useRouter();
  const [warehouses, setWarehouses] = React.useState<{ id: number; label: string }[]>([]);
  const [primaryWarehouse, setPrimaryWarehouse] = React.useState<{ id: number; name: string } | null>(null);
  const [scopeLoaded, setScopeLoaded] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const {
    control,
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { isSubmitting, errors, isValid },
  } = useForm<TransferBatchValues>({
    resolver: zodResolver(transferBatchSchema),
    mode: "onChange",
    defaultValues: {
      items: [{ eppId: undefined as unknown as number, quantity: 1 }],
      note: "",
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  React.useEffect(() => {
    Promise.all([
      fetch("/api/me/warehouse-scope").then((res) => (res.ok ? res.json() : null)),
      fetch("/api/warehouses?purpose=transfer-destination").then((res) =>
        res.ok ? res.json() : [],
      ),
    ])
      .then(([scope, list]: [
        { primaryWarehouse?: { id: number; name: string } | null } | null,
        Array<{ id: number; name: string }> | { warehouses?: Array<{ id: number; name: string }> },
      ]) => {
        const primary = scope?.primaryWarehouse ?? null;
        setPrimaryWarehouse(primary);
        if (primary) {
          setValue("fromId", primary.id);
        }
        const warehouseList = Array.isArray(list) ? list : list.warehouses ?? [];
        setWarehouses(
          warehouseList.map((w) => ({ id: w.id, label: w.name })),
        );
      })
      .catch(() => setWarehouses([]))
      .finally(() => setScopeLoaded(true));
  }, [setValue]);

  const fromId = watch("fromId");

  const onSubmit = async (data: TransferBatchValues) => {
    setSubmitError(null);
    const fd = new FormData();
    if (data.fromId) fd.append("fromId", String(data.fromId));
    fd.append("toId", String(data.toId));
    fd.append("note", data.note ?? "");
    fd.append("items", JSON.stringify(data.items));

    try {
      const result = await createTransfer(fd);
      if (!result.success) {
        setSubmitError(result.message);
        return;
      }

      if (result.requiresApproval) {
        toast.warning(result.message, { duration: 5000 });
      } else {
        toast.success(result.message);
      }
      onClose();
      router.replace("/stock-movements");
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Error al registrar el traslado");
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && !isSubmitting) onClose();
  };

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Nuevo traslado múltiple entre almacenes</DialogTitle>
          <DialogDescription>Selecciona el origen, destino y productos que se trasladarán.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="transfer-from">Almacén origen</Label>
              <div
                id="transfer-from"
                className="flex min-h-11 items-center rounded-md border border-input bg-muted px-3 py-2 text-sm"
              >
                {!scopeLoaded
                  ? "Cargando..."
                  : primaryWarehouse
                    ? primaryWarehouse.name
                    : "Sin almacén principal"}
              </div>
              <p className="text-xs text-muted-foreground">
                El origen es siempre tu almacén principal.
              </p>
              {scopeLoaded && !primaryWarehouse && (
                <p className="text-sm text-destructive" role="alert">
                  Configura tu almacén principal en Configuración para poder
                  trasladar.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="transfer-to">Almacén destino</Label>
              <Controller
                name="toId"
                control={control}
                render={({ field }) => (
                  <ComboboxWarehouse
                    id="transfer-to"
                    value={field.value ?? null}
                    onChange={field.onChange}
                    options={warehouses.filter((warehouse) => warehouse.id !== fromId)}
                    className="min-h-11"
                    aria-invalid={Boolean(errors.toId)}
                    aria-describedby={errors.toId ? "transfer-to-error" : undefined}
                  />
                )}
              />
              {errors.toId && <p id="transfer-to-error" className="text-sm text-destructive" role="alert">⚠️ {errors.toId.message}</p>}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Label htmlFor="transfer-items">Productos a trasladar</Label>
              <Button
                id="transfer-items"
                type="button"
                variant="outline"
                onClick={() => append({ eppId: undefined as unknown as number, quantity: 1 })}
                disabled={isSubmitting}
                className="min-h-11"
              >
                <Plus className="mr-2 size-4" aria-hidden="true" />
                Agregar producto
              </Button>
            </div>

            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-1 items-start gap-3 rounded-md border p-3 sm:grid-cols-12">
                <div className="space-y-2 sm:col-span-8">
                  <Label htmlFor={`transfer-epp-${index}`}>EPP {index + 1}</Label>
                  <Controller
                    name={`items.${index}.eppId`}
                    control={control}
                    render={({ field: itemField }) => (
                      <ComboboxEpp
                        id={`transfer-epp-${index}`}
                        value={itemField.value ?? null}
                        onChange={itemField.onChange}
                        className="min-h-11"
                        aria-invalid={Boolean(errors.items?.[index]?.eppId)}
                        aria-describedby={errors.items?.[index]?.eppId ? `transfer-epp-${index}-error` : undefined}
                      />
                    )}
                  />
                  {errors.items?.[index]?.eppId && <p id={`transfer-epp-${index}-error`} className="text-sm text-destructive" role="alert">⚠️ {errors.items[index]?.eppId?.message}</p>}
                </div>

                <div className="space-y-2 sm:col-span-3">
                  <Label htmlFor={`transfer-quantity-${index}`}>Cantidad</Label>
                  <Input
                    id={`transfer-quantity-${index}`}
                    type="number"
                    min={1}
                    step={1}
                    {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                    aria-invalid={Boolean(errors.items?.[index]?.quantity)}
                    aria-describedby={errors.items?.[index]?.quantity ? `transfer-quantity-${index}-error` : undefined}
                    className="h-11"
                  />
                  {errors.items?.[index]?.quantity && <p id={`transfer-quantity-${index}-error`} className="text-sm text-destructive" role="alert">⚠️ {errors.items[index]?.quantity?.message}</p>}
                </div>

                <div className="flex items-end justify-start sm:col-span-1 sm:justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={fields.length === 1 || isSubmitting}
                    onClick={() => remove(index)}
                    className="min-h-11 min-w-11"
                    aria-label={`Quitar producto ${index + 1}`}
                    title="Quitar producto"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            ))}

            {errors.items?.message && <p className="text-sm text-destructive" role="alert">⚠️ {errors.items.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="transfer-note">Nota (opcional)</Label>
            <Textarea id="transfer-note" rows={3} placeholder="Motivo del traslado" {...register("note")} aria-invalid={Boolean(errors.note)} aria-describedby={errors.note ? "transfer-note-error" : undefined} />
            {errors.note && <p id="transfer-note-error" className="text-sm text-destructive" role="alert">⚠️ {errors.note.message}</p>}
          </div>

          {submitError && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-800" role="alert">
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>{submitError}</span>
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 border-t pt-4 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting} className="min-h-11">Cancelar</Button>
            <Button type="submit" disabled={!isValid || isSubmitting || !primaryWarehouse} aria-busy={isSubmitting} className="min-h-11">
              {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />}
              {isSubmitting ? "Guardando traslado..." : submitError ? "Reintentar" : "Guardar traslado"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
