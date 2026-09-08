"use client";

import * as React from "react";
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
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Loader2, PackagePlus, Save } from "lucide-react";
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

type EppStockResponse = {
  stocks?: Array<{ quantity: number; warehouse: { id: number } }>;
};

export default function ModalCreateMovement({ onClose, defaultValues }: Props) {
  const router = useRouter();
  const [warehouses, setWarehouses] = React.useState<{ id: number; label: string }[]>([]);
  const [currentStock, setCurrentStock] = React.useState<number | null>(null);
  const [stockLoading, setStockLoading] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

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
      eppId: defaultValues?.eppId ?? undefined,
      warehouseId: defaultValues?.warehouseId ?? undefined,
      type: "ENTRY",
      quantity: 1,
      unitPrice: defaultValues?.unitPrice,
      note: "",
    },
  });

  React.useEffect(() => {
    fetch("/api/warehouses")
      .then((res) => {
        if (!res.ok) throw new Error("No se pudieron cargar los almacenes");
        return res.json();
      })
      .then((list: Array<{ id: number; name: string }>) => {
        setWarehouses(list.map((w) => ({ id: w.id, label: w.name })));
      })
      .catch(() => setWarehouses([]));
  }, []);

  const selectedEppId = watch("eppId");
  const selectedWarehouseId = watch("warehouseId");

  React.useEffect(() => {
    if (!selectedEppId || !selectedWarehouseId) {
      setCurrentStock(null);
      setStockLoading(false);
      return;
    }

    const controller = new AbortController();
    setStockLoading(true);
    fetch(`/api/epps/${selectedEppId}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error("No se pudo consultar el stock");
        return res.json() as Promise<EppStockResponse>;
      })
      .then((data) => {
        const stock = data.stocks?.find((item) => item.warehouse.id === selectedWarehouseId);
        setCurrentStock(stock?.quantity ?? 0);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setCurrentStock(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setStockLoading(false);
      });

    return () => controller.abort();
  }, [selectedEppId, selectedWarehouseId]);

  const onSubmit = async (data: MovementValues) => {
    setSubmitError(null);
    const fd = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && !(typeof value === "number" && Number.isNaN(value))) {
        fd.append(key, String(value));
      }
    });

    try {
      const result = await createMovement(fd);

      if (!result.success) {
        setSubmitError(result.message);
        return;
      }

      if (result.requiresApproval) {
        toast.warning(result.message || "Movimiento creado. Pendiente de aprobación.", { duration: 5000 });
      } else {
        toast.success(result.message || "Movimiento registrado exitosamente");
      }

      onClose();
      router.replace("/stock-movements");
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Error al registrar el movimiento");
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && !isSubmitting) onClose();
  };

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] max-h-[92vh] overflow-y-auto p-0 gap-0 sm:max-w-3xl">
        <DialogHeader className="border-b bg-slate-50/80 px-6 py-5 pr-14 sm:px-8">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <PackagePlus className="size-5" aria-hidden="true" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight sm:text-2xl">Registrar movimiento</DialogTitle>
              <DialogDescription className="mt-1 text-sm leading-5">
                Completa los datos para registrar una entrada, salida o ajuste de inventario.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 px-6 py-6 sm:px-8">
          <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <span className="flex size-7 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">1</span>
              Producto y ubicación
            </h3>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="movement-epp">Equipo de protección personal</Label>
                <Controller
                  name="eppId"
                  control={control}
                  render={({ field }) => (
                    <ComboboxEpp
                      id="movement-epp"
                      value={field.value ?? null}
                      onChange={field.onChange}
                      className="min-h-11"
                      aria-invalid={Boolean(errors.eppId)}
                      aria-describedby={errors.eppId ? "movement-epp-error" : undefined}
                    />
                  )}
                />
                {errors.eppId && <p id="movement-epp-error" className="text-sm text-destructive" role="alert">⚠️ {errors.eppId.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="movement-warehouse">Almacén</Label>
                <Controller
                  name="warehouseId"
                  control={control}
                  render={({ field }) => (
                    <ComboboxWarehouse
                      id="movement-warehouse"
                      value={field.value ?? null}
                      onChange={field.onChange}
                      options={warehouses}
                      className="min-h-11"
                      aria-invalid={Boolean(errors.warehouseId)}
                      aria-describedby={errors.warehouseId ? "movement-warehouse-error" : undefined}
                    />
                  )}
                />
                {errors.warehouseId && <p id="movement-warehouse-error" className="text-sm text-destructive" role="alert">⚠️ {errors.warehouseId.message}</p>}
              </div>
            </div>

            {selectedEppId && selectedWarehouseId && (
              <div
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium ${
                  currentStock !== null && currentStock > 0
                    ? "border-green-200 bg-green-50 text-green-700"
                    : "border-slate-200 bg-slate-50 text-slate-700"
                }`}
                aria-live="polite"
                aria-busy={stockLoading}
              >
                {stockLoading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    Consultando stock en el almacén seleccionado...
                  </>
                ) : (
                  <>
                    <span aria-hidden="true">●</span>
                    Stock en el almacén seleccionado: <span className="font-bold">{currentStock ?? "No disponible"} unidades</span>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <span className="flex size-7 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">2</span>
              Detalles del movimiento
            </h3>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="movement-type">Tipo de movimiento</Label>
                <select
                  id="movement-type"
                  {...register("type")}
                  aria-invalid={Boolean(errors.type)}
                  aria-describedby={errors.type ? "movement-type-error" : "movement-type-help"}
                  className="block h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="ENTRY">Entrada</option>
                  <option value="EXIT">Salida</option>
                  <option value="ADJUSTMENT">Ajuste</option>
                </select>
                {errors.type ? (
                  <p id="movement-type-error" className="text-sm text-destructive" role="alert">⚠️ {errors.type.message}</p>
                ) : (
                  <p id="movement-type-help" className="text-xs leading-4 text-muted-foreground">Define cómo afectará el stock.</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="movement-quantity">Cantidad</Label>
                <Input
                  id="movement-quantity"
                  type="number"
                  step={1}
                  min={1}
                  {...register("quantity", { valueAsNumber: true })}
                  aria-invalid={Boolean(errors.quantity)}
                  aria-describedby={errors.quantity ? "movement-quantity-error" : "movement-quantity-help"}
                  className="h-11 focus:border-blue-500 focus:ring-blue-500/20"
                />
                {errors.quantity ? (
                  <p id="movement-quantity-error" className="text-sm text-destructive" role="alert">⚠️ {errors.quantity.message}</p>
                ) : (
                  <p id="movement-quantity-help" className="text-xs leading-4 text-muted-foreground">Unidades que se registrarán.</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="movement-unit-price">Precio unitario <span className="font-normal text-slate-400">(opcional)</span></Label>
                <Input
                  id="movement-unit-price"
                  type="number"
                  step={0.01}
                  min={0}
                  placeholder="0.00"
                  {...register("unitPrice", { valueAsNumber: true })}
                  aria-invalid={Boolean(errors.unitPrice)}
                  aria-describedby={errors.unitPrice ? "movement-unit-price-error" : "movement-unit-price-help"}
                  className="h-11 focus:border-blue-500 focus:ring-blue-500/20"
                />
                {errors.unitPrice ? (
                  <p id="movement-unit-price-error" className="text-sm text-destructive" role="alert">⚠️ {errors.unitPrice.message}</p>
                ) : (
                  <p id="movement-unit-price-help" className="text-xs leading-4 text-muted-foreground">Valor de cada unidad.</p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <span className="flex size-7 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">3</span>
              Información adicional (opcional)
            </h3>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="movement-purchase-order">Orden de compra</Label>
                <Input id="movement-purchase-order" {...register("purchaseOrder")} placeholder="Ej: OC-2026-001" className="h-11 focus:border-blue-500 focus:ring-blue-500/20" />
                <p className="text-xs leading-4 text-muted-foreground">Ayuda a rastrear el origen de la compra.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="movement-note">Nota</Label>
                <Input id="movement-note" {...register("note")} placeholder="Ej: Compra urgente, revisión especial..." className="h-11 focus:border-blue-500 focus:ring-blue-500/20" />
                <p className="text-xs leading-4 text-muted-foreground">Añade cualquier detalle relevante.</p>
              </div>
            </div>
          </div>

          {submitError && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-800" role="alert">
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>{submitError}</span>
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-end">
            <Button variant="outline" type="button" onClick={onClose} disabled={isSubmitting} className="min-h-11 px-6">
              Cancelar
            </Button>
            <Button type="submit" disabled={!isValid || isSubmitting} aria-busy={isSubmitting} className="min-h-11 bg-blue-600 px-6 hover:bg-blue-700">
              {isSubmitting ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Save className="size-4" aria-hidden="true" />}
              {isSubmitting ? "Guardando movimiento..." : submitError ? "Reintentar" : "Guardar movimiento"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
