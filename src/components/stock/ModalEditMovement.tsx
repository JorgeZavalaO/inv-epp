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
  const [currentStock, setCurrentStock] = useState<number | null>(null);

  /* form */
  const {
    register,
    handleSubmit,
    watch,
    formState: { isSubmitting, errors, isValid },
  } = useForm<MovementValues>({
    resolver: zodResolver(stockMovementSchema),
    mode: "onChange",
    defaultValues: {
      eppId: movement.eppId,
      warehouseId: movement.warehouseId,
      type: movement.type,
      quantity: movement.quantity,
      note: movement.note ?? "",
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

  /* traer stock actual del EPP */
  const selectedEppId = watch("eppId");
  useEffect(() => {
    if (!selectedEppId) {
      setCurrentStock(null);
      return;
    }
    fetch(`/api/epps/${selectedEppId}`)
      .then((res) => res.json())
      .then((d: { stocks?: { quantity: number }[] }) => {
        if (Array.isArray(d.stocks)) {
          setCurrentStock(d.stocks.reduce((acc, s) => acc + s.quantity, 0));
        } else {
          setCurrentStock(null);
        }
      })
      .catch(() => setCurrentStock(null));
  }, [selectedEppId]);

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

          {/* Tipo */}
          <div className="space-y-1">
            <Label>Tipo de movimiento</Label>
            <Input disabled value={movement.type} />
          </div>

          {/* Cantidad */}
          <div className="space-y-1">
            <Label>Cantidad</Label>
            <Input
              type="number"
              step={1}
              min={1}
              {...register("quantity", { valueAsNumber: true })}
            />
            {currentStock !== null && (
              <p className="text-sm text-muted-foreground">
                Stock total actual:&nbsp;
                <span
                  className={
                    currentStock > 0
                      ? "text-green-600 font-medium"
                      : "text-red-600 font-medium"
                  }
                >
                  {currentStock}
                </span>
              </p>
            )}
            {errors.quantity && (
              <p className="text-destructive text-sm">
                {errors.quantity.message}
              </p>
            )}
          </div>

          {/* Nota */}
          <div className="space-y-1">
            <Label>Nota</Label>
            <Textarea rows={3} {...register("note")} />
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
