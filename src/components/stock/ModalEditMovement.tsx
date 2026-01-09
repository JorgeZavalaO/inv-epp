"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import {
  stockMovementSchema,
  MovementValues,
} from "@/schemas/stock-movement-schema";
import {
  createMovement,
  deleteMovement,
} from "@/app/(protected)/stock-movements/actions";
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
  const [warehouses, setWarehouses] = useState<
    { id: number; label: string }[]
  >([]);

  /* form */
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

  /* cargar almacenes para el combobox (solo para mostrar) */
  useEffect(() => {
    fetch("/api/warehouses")
      .then((res) => res.json())
      .then(
        (list: Array<{ id: number; name: string }>) =>
          setWarehouses(list.map((w) => ({ id: w.id, label: w.name })))
      )
      .catch(() => setWarehouses([]));
  }, []);

  /* submit */
  const onSubmit = async (data: MovementValues) => {
    try {
      await deleteMovement(movement.id); // revertir & borrar viejo

      /* ▶ quitamos id y marcamos la variable como usada */
      const { id: _ignored, ...rest } = data;
      void _ignored;                         // ✅ evita warning no-unused-vars

      const fd = new FormData();
      Object.entries(rest).forEach(([k, v]) => fd.append(k, String(v)));

      await createMovement(fd);             // crear nuevo
      toast.success("Movimiento actualizado");
      onClose();
      router.replace("/stock-movements");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al actualizar");
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Movimiento</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6">
          {/* EPP (solo lectura) */}
          <div className="space-y-1">
            <Label>EPP</Label>
            <ComboboxEpp value={movement.eppId} onChange={() => {}} />
          </div>

          {/* Almacén (solo lectura) */}
          <div className="space-y-1">
            <Label>Almacén</Label>
            <ComboboxWarehouse
              value={movement.warehouseId}
              onChange={() => {}}
              options={warehouses}
            />
          </div>

          {/* Tipo, Cantidad y Precio */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label>Tipo de movimiento</Label>
              <Input disabled value={movement.type} className="bg-gray-100" />
            </div>
            <div className="space-y-1">
              <Label>Cantidad</Label>
              <Input
                type="number"
                step={1}
                min={1}
                {...register("quantity", { valueAsNumber: true })}
                className="focus:ring-2 focus:ring-blue-500"
              />
              {errors.quantity && (
                <p className="text-destructive text-sm">{errors.quantity.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label>Precio unitario (opcional)</Label>
              <Input
                type="number"
                step={0.01}
                min={0}
                placeholder="0.00"
                {...register("unitPrice", { valueAsNumber: true })}
                className="focus:ring-2 focus:ring-blue-500"
              />
              {errors.unitPrice && (
                <p className="text-destructive text-sm">{errors.unitPrice.message}</p>
              )}
            </div>
          </div>

          {/* Nota */}
          <div className="space-y-1">
            <Label>Nota</Label>
            <Textarea rows={3} {...register("note")} />
          </div>

          {/* Orden de Compra */}
          <div className="space-y-1">
            <Label>Orden de Compra (opcional)</Label>
            <Input {...register("purchaseOrder")} placeholder="Ej: OC-2026-001" />
          </div>

          {/* botones */}
          <div className="flex justify-end gap-4 pt-4">
            <Button
              variant="outline"
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!isValid || isSubmitting}
              className="flex items-center"
            >
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Guardar cambios
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
