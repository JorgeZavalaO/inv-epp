"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { stockMovementSchema, MovementValues } from "@/schemas/stock-movement-schema";
import { createMovement } from "@/app/(protected)/stock-movements/actions";
import ComboboxEpp from "@/components/ui/ComboboxEpp";
import ComboboxWarehouse from "@/components/ui/ComboboxWarehouse";

type Props = {
  onClose: () => void;
  defaultValues?: Partial<MovementValues>;
};

export default function ModalCreateMovement({ onClose, defaultValues }: Props) {
  const router = useRouter();
  const [warehouses, setWarehouses] = React.useState<{ id: number; label: string }[]>([]);
  const [currentStock, setCurrentStock] = React.useState<number | null>(null);

  const {
    control,
    register,
    handleSubmit,
    watch,
    formState: { isSubmitting, errors, isValid },
  } = useForm<MovementValues>({
    resolver: zodResolver(stockMovementSchema),
    mode: "onChange",
    defaultValues: {
      eppId:       defaultValues?.eppId ?? undefined,
      warehouseId: defaultValues?.warehouseId ?? undefined,
      type:        "ENTRY",
      quantity:    1,
      note:        "",
    },
  });

  // Al cargar el modal, traigo lista de almacenes
  React.useEffect(() => {
    fetch("/api/warehouses")
      .then((res) => res.json())
      .then((list: Array<{ id: number; name: string }>) => {
        setWarehouses(list.map((w) => ({ id: w.id, label: w.name })));
      })
      .catch(() => {
        setWarehouses([]);
      });
  }, []);

  // Cuando cambia eppId, recargo stock actual (suma de todos los almacenes:
  // suponemos que en API /api/epps/[id] viene el “stock” global)
  const selectedEppId = watch("eppId");
  React.useEffect(() => {
    if (!selectedEppId) {
      setCurrentStock(null);
      return;
    }
    fetch(`/api/epps/${selectedEppId}`)
      .then((res) => res.json())
      .then((data: { stocks?: Array<{ quantity: number }> }) => {
        // si la ruta devuelve campo 'stocks' (array), sumamos; si no, se ignora:
        if (Array.isArray(data.stocks)) {
          const total = data.stocks.reduce((acc, s) => acc + (s.quantity || 0), 0);
          setCurrentStock(total);
        } else {
          setCurrentStock(null);
        }
      })
      .catch(() => setCurrentStock(null));
  }, [selectedEppId]);

  const onSubmit = async (data: MovementValues) => {
    const fd = new FormData();
    Object.entries(data).forEach(([k, v]) => fd.append(k, String(v ?? "")));

    try {
      const result = await createMovement(fd);
      
      // Verificar si el resultado indica que requiere aprobación
      if (result && 'requiresApproval' in result && result.requiresApproval) {
        toast.warning(result.message || "Movimiento creado. Pendiente de aprobación.", {
          duration: 5000,
        });
      } else {
        toast.success(result?.message || "Movimiento registrado exitosamente");
      }
      
      onClose();
      router.replace("/stock-movements");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al registrar";
      toast.error(msg);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo Movimiento</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6">
          {/* EPP */}
          <div className="space-y-1">
            <Label>Equipo de Protección Personal</Label>
            <Controller
              name="eppId"
              control={control}
              render={({ field }) => <ComboboxEpp value={field.value} onChange={field.onChange} />}
            />
            {selectedEppId && currentStock !== null && (
              <p className="text-sm text-muted-foreground">
                Stock total actual:{" "}
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
            {errors.eppId && <p className="text-destructive text-sm">{errors.eppId.message}</p>}
          </div>

          {/* Almacén */}
          <div className="space-y-1">
            <Label>Almacén</Label>
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

          {/* Tipo y Cantidad */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Tipo de movimiento</Label>
              <select
                {...register("type")}
                className="block w-full rounded border px-3 py-2"
              >
                <option value="ENTRY">Entrada</option>
                <option value="EXIT">Salida</option>
                <option value="ADJUSTMENT">Ajuste</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label>Cantidad</Label>
              <Input
                type="number"
                step={1}
                min={1}
                {...register("quantity", { valueAsNumber: true })}
              />
              {errors.quantity && (
                <p className="text-destructive text-sm">{errors.quantity.message}</p>
              )}
            </div>
          </div>

          {/* Nota */}
          <div className="space-y-1">
            <Label>Nota (opcional)</Label>
            <Textarea rows={3} {...register("note")} />
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-4 pt-4">
            <Button variant="outline" type="button" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!isValid || isSubmitting} className="flex items-center">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
