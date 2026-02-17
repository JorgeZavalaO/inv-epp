"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Trash2 } from "lucide-react";
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

  const {
    control,
    register,
    handleSubmit,
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

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  React.useEffect(() => {
    fetch("/api/warehouses")
      .then((res) => res.json())
      .then((list: Array<{ id: number; name: string }>) => {
        setWarehouses(list.map((w) => ({ id: w.id, label: w.name })));
      })
      .catch(() => setWarehouses([]));
  }, []);

  const fromId = watch("fromId");

  const onSubmit = async (data: TransferBatchValues) => {
    const fd = new FormData();
    fd.append("fromId", String(data.fromId));
    fd.append("toId", String(data.toId));
    fd.append("note", data.note ?? "");
    fd.append("items", JSON.stringify(data.items));

    try {
      const result = await createTransfer(fd);
      if (result.requiresApproval) {
        toast.warning(result.message, { duration: 5000 });
      } else {
        toast.success(result.message);
      }
      onClose();
      router.replace("/stock-movements");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al registrar traslado");
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo traslado múltiple entre almacenes</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Almacén origen</Label>
              <Controller
                name="fromId"
                control={control}
                render={({ field }) => (
                  <ComboboxWarehouse
                    value={field.value ?? null}
                    onChange={field.onChange}
                    options={warehouses}
                  />
                )}
              />
              {errors.fromId && <p className="text-destructive text-sm">{errors.fromId.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Almacén destino</Label>
              <Controller
                name="toId"
                control={control}
                render={({ field }) => (
                  <ComboboxWarehouse
                    value={field.value ?? null}
                    onChange={field.onChange}
                    options={warehouses.filter((w) => w.id !== fromId)}
                  />
                )}
              />
              {errors.toId && <p className="text-destructive text-sm">{errors.toId.message}</p>}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Productos a trasladar</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ eppId: undefined as unknown as number, quantity: 1 })}
              >
                <Plus className="h-4 w-4 mr-1" />
                Agregar producto
              </Button>
            </div>

            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start border rounded-md p-3">
                <div className="md:col-span-8 space-y-2">
                  <Label>EPP #{index + 1}</Label>
                  <Controller
                    name={`items.${index}.eppId`}
                    control={control}
                    render={({ field: itemField }) => (
                      <ComboboxEpp value={itemField.value} onChange={itemField.onChange} />
                    )}
                  />
                  {errors.items?.[index]?.eppId && (
                    <p className="text-destructive text-sm">{errors.items[index]?.eppId?.message}</p>
                  )}
                </div>

                <div className="md:col-span-3 space-y-2">
                  <Label>Cantidad</Label>
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                  />
                  {errors.items?.[index]?.quantity && (
                    <p className="text-destructive text-sm">{errors.items[index]?.quantity?.message}</p>
                  )}
                </div>

                <div className="md:col-span-1 pt-7">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={fields.length === 1}
                    onClick={() => remove(index)}
                    title="Quitar producto"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            {errors.items?.message && <p className="text-destructive text-sm">{errors.items.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Nota (opcional)</Label>
            <Textarea rows={3} placeholder="Motivo del traslado" {...register("note")} />
            {errors.note && <p className="text-destructive text-sm">{errors.note.message}</p>}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!isValid || isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? "Guardando..." : "Guardar traslado"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
