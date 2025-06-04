"use client";
import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { transferSchema, TransferValues } from "@/schemas/transfer-schema";
import ComboboxEpp from "@/components/ui/ComboboxEpp";
import ComboboxWarehouse from "@/components/ui/ComboboxWarehouse";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type WarehouseOption = { id: number; label: string };

interface TransferFormProps {
  warehouses: WarehouseOption[];
}

export default function TransferForm({ warehouses }: TransferFormProps) {
  const {
    control,
    handleSubmit,
    formState: { isSubmitting, errors, isValid },
    watch,
    setError,
    clearErrors,
    register,
  } = useForm<TransferValues>({
    resolver: zodResolver(transferSchema),
    mode: "onChange",
    defaultValues: { eppId: undefined, fromId: undefined, toId: undefined, quantity: 1, note: "" },
  });

  const watchedEppId    = watch("eppId");
  const watchedFromId   = watch("fromId");
  const watchedQuantity = watch("quantity");

  const [currentStock, setCurrentStock] = React.useState<number | null>(null);
  const [exceedsStock, setExceedsStock] = React.useState(false);

  /* ───── Stock origen ──── */
  React.useEffect(() => {
    async function fetchStock() {
      if (typeof watchedEppId === "number" && typeof watchedFromId === "number") {
        try {
          const res  = await fetch(
            `/api/epp-stocks?eppId=${watchedEppId}&warehouseId=${watchedFromId}`,
            { cache: "no-store" }
          );
          const json = await res.json();
          setCurrentStock(res.ok ? json.quantity : 0);
        } catch {
          setCurrentStock(0);
        }
      } else {
        setCurrentStock(null);
      }
    }
    fetchStock();
  }, [watchedEppId, watchedFromId]);

  /* ───── Validar cantidad ≤ stock ──── */
  React.useEffect(() => {
    if (currentStock !== null) {
      const invalid = watchedQuantity > currentStock;
      setExceedsStock(invalid);
      if (invalid) {
        setError("quantity", { type: "manual", message: "La cantidad excede el stock disponible" });
      } else {
        clearErrors("quantity");
      }
    }
  }, [watchedQuantity, currentStock, setError, clearErrors]);

  /* ───── submit ──── */
  const onSubmit = async (data: TransferValues) => {
    if (exceedsStock) return toast.error("No puedes transferir más del stock disponible");
    try {
      const res  = await fetch("/api/warehouses/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success("Transferencia exitosa");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error inesperado");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6 max-w-lg mx-auto py-6">
      {/* EPP */}
      <Controller
        name="eppId"
        control={control}
        render={({ field }) => (
          <div className="space-y-1">
            <Label>Artículo (EPP)</Label>
            <ComboboxEpp
              value={field.value ?? null}
              onChange={field.onChange}
            />
            {errors.eppId && <p className="text-destructive text-sm">{errors.eppId.message}</p>}
          </div>
        )}
      />

      {/* Origen */}
      <Controller
        name="fromId"
        control={control}
        render={({ field }) => (
          <div className="space-y-1">
            <Label>Almacén origen</Label>
            <ComboboxWarehouse
              value={field.value ?? null}
              onChange={field.onChange}
              options={warehouses}
            />
            {errors.fromId && <p className="text-destructive text-sm">{errors.fromId.message}</p>}
          </div>
        )}
      />

      {currentStock !== null && (
        <p className="text-sm text-muted-foreground">
          Stock en origen:&nbsp;
          <span className={exceedsStock ? "text-red-600 font-semibold" : "text-green-600 font-semibold"}>
            {currentStock}
          </span>
        </p>
      )}

      {/* Destino */}
      <Controller
        name="toId"
        control={control}
        render={({ field }) => (
          <div className="space-y-1">
            <Label>Almacén destino</Label>
            <ComboboxWarehouse
              value={field.value ?? null}
              onChange={field.onChange}
              options={warehouses}
            />
            {errors.toId && <p className="text-destructive text-sm">{errors.toId.message}</p>}
          </div>
        )}
      />

      {/* Cantidad */}
      <div className="space-y-1">
        <Label>Cantidad a transferir</Label>
        <Input type="number" min={1} step={1} {...register("quantity", { valueAsNumber: true })} />
        {errors.quantity && <p className="text-destructive text-sm">{errors.quantity.message}</p>}
      </div>

      {/* Nota */}
      <div className="space-y-1">
        <Label>Nota (opcional)</Label>
        <Textarea rows={3} {...register("note")} placeholder="Comentarios adicionales…" />
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-4 pt-4">
        <Button type="submit" disabled={isSubmitting || !isValid || exceedsStock} className="flex items-center">
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Transferir
        </Button>
      </div>
    </form>
  );
}
