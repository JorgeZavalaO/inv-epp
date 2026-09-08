"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { stockMovementSchema, MovementValues } from "@/schemas/stock-movement-schema";
import { updateMovement } from "@/app/(protected)/stock-movements/actions";
import ComboboxEpp from "@/components/ui/ComboboxEpp";
import ComboboxWarehouse from "@/components/ui/ComboboxWarehouse";
import { Row as MovementRow } from "@/components/stock/MovementTable";
import { useEffect, useState } from "react";

export default function ModalEditMovement({
  movement,
  onClose,
}: {
  movement: MovementRow;
  onClose: () => void;
}) {
  const router = useRouter();
  const [warehouses, setWarehouses] = useState<{ id: number; label: string }[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { isSubmitting, errors, isValid },
  } = useForm<MovementValues>({
    resolver: zodResolver(stockMovementSchema),
    mode: "onChange",
    defaultValues: {
      eppId: movement.eppId,
      warehouseId: movement.warehouseId,
      type: movement.type,
      quantity: movement.quantity,
      unitPrice: movement.unitPrice ?? undefined,
      note: movement.note ?? "",
      purchaseOrder: movement.purchaseOrder ?? "",
    },
  });

  useEffect(() => {
    fetch("/api/warehouses")
      .then((res) => res.json())
      .then((list: Array<{ id: number; name: string }>) =>
        setWarehouses(list.map((w) => ({ id: w.id, label: w.name })))
      )
      .catch(() => setWarehouses([]));
  }, []);

  const onSubmit = async (data: MovementValues) => {
    setSubmitError(null);
    const fd = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && !(typeof value === "number" && Number.isNaN(value))) {
        fd.append(key, String(value));
      }
    });

    try {
      const result = await updateMovement(movement.id, fd);
      if (!result.success) {
        setSubmitError(result.message);
        return;
      }

      toast.success(result.message);
      onClose();
      router.replace("/stock-movements");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Error al actualizar el movimiento");
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && !isSubmitting) onClose();
  };

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar movimiento</DialogTitle>
          <DialogDescription>Actualiza los datos del movimiento sin perder su registro ni afectar la consistencia del stock.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-movement-epp">EPP</Label>
              <ComboboxEpp id="edit-movement-epp" value={movement.eppId} onChange={() => {}} disabled className="min-h-11" />
              <input type="hidden" {...register("eppId", { valueAsNumber: true })} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-movement-warehouse">Almacén</Label>
              <ComboboxWarehouse id="edit-movement-warehouse" value={movement.warehouseId} onChange={() => {}} options={warehouses} disabled className="min-h-11" />
              <input type="hidden" {...register("warehouseId", { valueAsNumber: true })} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="edit-movement-type">Tipo de movimiento</Label>
              <Input id="edit-movement-type" readOnly value={movement.type === "ENTRY" ? "Entrada" : "Salida"} aria-describedby="edit-movement-type-help" />
              <input type="hidden" {...register("type")} />
              <p id="edit-movement-type-help" className="text-xs text-muted-foreground">El tipo no se puede cambiar después de registrar el movimiento.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-movement-quantity">Cantidad</Label>
              <Input
                id="edit-movement-quantity"
                type="number"
                step={1}
                min={1}
                {...register("quantity", { valueAsNumber: true })}
                aria-invalid={Boolean(errors.quantity)}
                aria-describedby={errors.quantity ? "edit-movement-quantity-error" : undefined}
                className="h-11 focus:ring-2 focus:ring-blue-500"
              />
              {errors.quantity && <p id="edit-movement-quantity-error" className="text-sm text-destructive" role="alert">⚠️ {errors.quantity.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-movement-unit-price">Precio unitario (opcional)</Label>
              <Input
                id="edit-movement-unit-price"
                type="number"
                step={0.01}
                min={0}
                placeholder="0.00"
                {...register("unitPrice", { valueAsNumber: true })}
                aria-invalid={Boolean(errors.unitPrice)}
                aria-describedby={errors.unitPrice ? "edit-movement-unit-price-error" : undefined}
                className="h-11 focus:ring-2 focus:ring-blue-500"
              />
              {errors.unitPrice && <p id="edit-movement-unit-price-error" className="text-sm text-destructive" role="alert">⚠️ {errors.unitPrice.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-movement-note">Nota</Label>
            <Textarea id="edit-movement-note" rows={3} {...register("note")} aria-invalid={Boolean(errors.note)} aria-describedby={errors.note ? "edit-movement-note-error" : undefined} />
            {errors.note && <p id="edit-movement-note-error" className="text-sm text-destructive" role="alert">⚠️ {errors.note.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-movement-purchase-order">Orden de compra (opcional)</Label>
            <Input id="edit-movement-purchase-order" {...register("purchaseOrder")} placeholder="Ej: OC-2026-001" aria-invalid={Boolean(errors.purchaseOrder)} aria-describedby={errors.purchaseOrder ? "edit-movement-purchase-order-error" : undefined} />
            {errors.purchaseOrder && <p id="edit-movement-purchase-order-error" className="text-sm text-destructive" role="alert">⚠️ {errors.purchaseOrder.message}</p>}
          </div>

          {submitError && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-800" role="alert">
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>{submitError}</span>
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 border-t pt-4 sm:flex-row sm:justify-end">
            <Button variant="outline" type="button" onClick={onClose} disabled={isSubmitting} className="min-h-11">Cancelar</Button>
            <Button type="submit" disabled={!isValid || isSubmitting} aria-busy={isSubmitting} className="min-h-11">
              {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />}
              {isSubmitting ? "Guardando cambios..." : submitError ? "Reintentar" : <><Save className="mr-2 size-4" aria-hidden="true" />Guardar cambios</>}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
