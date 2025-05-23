"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { stockMovementSchema, MovementValues } from "@/schemas/stock-movement-schema";
import { createMovement } from "@/app/(protected)/stock-movements/actions";

import ComboboxEpp from "@/components/ui/ComboboxEpp";
import { Input }       from "@/components/ui/input";
import { Button }      from "@/components/ui/button";
import { Label }       from "@/components/ui/label";
import { Textarea }    from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function StockMovementForm({
  defaultEppId,
}: {
  defaultEppId?: number;
}) {
  const router = useRouter();
  const [currentStock, setCurrentStock] = React.useState<number | null>(null);

  const {
    handleSubmit,
    control,
    register,
    formState: { isSubmitting, errors, isValid },
    watch,
  } = useForm<MovementValues>({
    resolver: zodResolver(stockMovementSchema),
    mode: "onChange",
    defaultValues: {
      eppId:    defaultEppId,
      type:     "ENTRY",
      quantity: 1,
      note:     "",
    },
  });

  const selectedEppId = watch("eppId");
  const selectedType  = watch("type");

  React.useEffect(() => {
    if (!selectedEppId) {
      setCurrentStock(null);
      return;
    }
    fetch(`/api/epps/${selectedEppId}`)
      .then((res) => res.json())
      .then((data: { id: number; stock: number }) => setCurrentStock(data.stock))
      .catch(() => setCurrentStock(null));
  }, [selectedEppId]);

  const onSubmit = async (data: MovementValues) => {
    const fd = new FormData();
    Object.entries(data).forEach(([k, v]) => fd.append(k, String(v ?? "")));

    try {
      await createMovement(fd);
      toast.success("Movimiento registrado");
      router.push("/stock-movements");
    } catch (e: unknown) {
      const errorMessage =
        e && typeof e === "object" && "message" in e
          ? String((e as { message?: unknown }).message)
          : "Error inesperado";
      toast.error(errorMessage);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nuevo Movimiento</CardTitle>
      </CardHeader>
      <CardContent>
        {Object.keys(errors).length > 0 && (
          <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded">
            <ul className="list-disc list-inside space-y-1 text-sm">
              {Object.entries(errors).map(([field, err]) => (
                <li key={field}>
                  {(err as import("react-hook-form").FieldError)?.message || `Error en ${field}`}
                </li>
              ))}
            </ul>
          </div>
        )}

        <form
          onSubmit={handleSubmit(onSubmit)}
          aria-busy={isSubmitting}
          className="grid gap-6"
        >
          {/* EPP Selector */}
          <div className="space-y-1">
            <Label htmlFor="eppId">Equipo de Protección Personal</Label>
            <Controller
              name="eppId"
              control={control}
              render={({ field }) => (
                <ComboboxEpp value={field.value} onChange={field.onChange} />
              )}
            />
            {selectedEppId && currentStock !== null && (
              <p className="text-sm text-muted-foreground">
                Stock actual:{" "}
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

          {/* Type & Quantity */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="type">Tipo de movimiento</Label>
              <select
                id="type"
                {...register("type")}
                className="block w-full rounded border px-3 py-2"
              >
                <option value="ENTRY">Entrada</option>
                <option value="EXIT">Salida</option>
                <option value="ADJUSTMENT">Ajuste</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="quantity">Cantidad</Label>
              <Input
                id="quantity"
                type="number"
                inputMode="numeric"
                step={1}
                min={1}
                {...register("quantity", { valueAsNumber: true })}
              />
              {selectedType === "EXIT" && currentStock !== null && (
                <p className="text-sm text-muted-foreground">Máximo: {currentStock}</p>
              )}
              {errors.quantity && (
                <p className="text-destructive text-sm">{errors.quantity.message}</p>
              )}
            </div>
          </div>

          {/* Note */}
          <div className="space-y-1">
            <Label htmlFor="note">Nota (opcional)</Label>
            <Textarea id="note" rows={3} {...register("note")} />
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !isValid}
              className="flex items-center"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
