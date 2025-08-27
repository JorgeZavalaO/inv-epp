"use client";

import * as React from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Trash } from "lucide-react";

import { DeliveryBatchValues, deliveryBatchSchema } from "@/schemas/delivery-batch-schema";
import ComboboxCollaborator from "@/components/ui/ComboboxCollaborator";
import ComboboxWarehouse    from "@/components/ui/ComboboxWarehouse";
import ComboboxEpp          from "@/components/ui/ComboboxEpp";
import { Label }            from "@/components/ui/label";
import { Input }            from "@/components/ui/input";
import { Textarea }         from "@/components/ui/textarea";
import { Button }           from "@/components/ui/button";
import { Badge }            from "@/components/ui/badge";

export default function DeliveryBatchForm({
  collaborators,
  warehouses,
  defaultValues,
  onSubmit,
  onCancel,
  isPending = false,
}: {
  collaborators: { id: number; label: string; position?: string; location?: string }[];
  warehouses:    { id: number; label: string }[];
  defaultValues?: DeliveryBatchValues;
  onSubmit(values: DeliveryBatchValues): void;
  onCancel?: () => void;
  isPending?: boolean;
}) {
  const {
    control,
    handleSubmit,
    watch,
    formState: { isSubmitting, errors, isValid },
  } = useForm<DeliveryBatchValues>({
    resolver:      zodResolver(deliveryBatchSchema),
    mode:          "onChange",
    defaultValues: defaultValues ?? {
      collaboratorId: undefined,
      warehouseId:    undefined,
      note:           "",
      items:         [{ eppId: undefined!, quantity: 1 }],
    },
  });

  const items       = watch("items") as { eppId?: number; quantity?: number }[];
  const warehouseId = watch("warehouseId") as number | undefined;
  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  const [stockMap, setStockMap]     = React.useState<Record<string, number>>({});
  const [loadingMap, setLoadingMap] = React.useState<Record<string, boolean>>({});

  // Limpiar cache al cambiar de almacén
  React.useEffect(() => {
    setStockMap({});
    setLoadingMap({});
  }, [warehouseId]);

  // Firma única para los items (evita bucles)
  const itemsSignature = React.useMemo(
    () => JSON.stringify(items.map((it) => `${it.eppId}-${it.quantity}`)),
    [items]
  );

  React.useEffect(() => {
    if (!warehouseId) return;
    const ctrls: AbortController[] = [];

    items.forEach((it) => {
      if (!it.eppId) return;
      const key = `${it.eppId}-${warehouseId}`;
      if (stockMap[key] !== undefined || loadingMap[key]) return;

      setLoadingMap((m) => ({ ...m, [key]: true }));
      const ctrl = new AbortController();
      ctrls.push(ctrl);

      fetch(`/api/epp-stocks?eppId=${it.eppId}&warehouseId=${warehouseId}`, {
        signal: ctrl.signal,
      })
        .then((r) => r.json())
        .then(({ quantity }: { quantity: number }) =>
          setStockMap((m) => ({ ...m, [key]: quantity }))
        )
        .catch((e) => {
          if (e.name !== "AbortError") {
            setStockMap((m) => ({ ...m, [key]: 0 }));
          }
        })
        .finally(() => {
          setLoadingMap((m) => ({ ...m, [key]: false }));
        });
    });

    return () => ctrls.forEach((c) => c.abort());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [warehouseId, itemsSignature]);

  return (
    <div className="flex flex-col h-full max-h-[calc(90vh-200px)]">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full">
        {/* Información básica - siempre visible */}
        <div className="flex-shrink-0 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border-b bg-muted/50">
          {/* Colaborador */}
          <Controller
            name="collaboratorId"
            control={control}
            render={({ field }) => (
              <div className="space-y-1">
                <Label>Colaborador</Label>
                <ComboboxCollaborator
                  value={field.value ?? null}
                  onChange={field.onChange}
                  options={collaborators}
                />
                {errors.collaboratorId && (
                  <p className="text-destructive text-sm">
                    {errors.collaboratorId.message}
                  </p>
                )}
              </div>
            )}
          />

          {/* Almacén */}
          <Controller
            name="warehouseId"
            control={control}
            render={({ field }) => (
              <div className="space-y-1">
                <Label>Almacén</Label>
                {warehouses.length === 0 ? (
                  <div className="flex items-center">
                    <Loader2 className="animate-spin mr-2" /> Cargando...
                  </div>
                ) : (
                  <ComboboxWarehouse
                    value={field.value ?? null}
                    onChange={field.onChange}
                    options={warehouses}
                  />
                )}
                {errors.warehouseId && (
                  <p className="text-destructive text-sm">
                    {errors.warehouseId.message}
                  </p>
                )}
              </div>
            )}
          />
        </div>

        {/* Lista de ítems - área scrolleable */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Items de la entrega</h3>
              <Button 
                type="button"
                variant="outline" 
                size="sm"
                onClick={() => append({ eppId: undefined!, quantity: 1 })}
              >
                <Plus size={16} className="mr-1" /> Añadir ítem
              </Button>
            </div>
            
            {fields.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No hay items agregados</p>
                <Button 
                  type="button"
                  variant="outline" 
                  className="mt-4"
                  onClick={() => append({ eppId: undefined!, quantity: 1 })}
                >
                  <Plus size={16} className="mr-2" /> Agregar primer ítem
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {fields.map((f, idx) => {
                  const it = items[idx];
                  const key = it.eppId && warehouseId ? `${it.eppId}-${warehouseId}` : "";
                  const stock = stockMap[key];
                  const loading = loadingMap[key];

                  return (
                    <div key={f.id} className="p-4 border rounded-lg bg-card">
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                        {/* EPP */}
                        <Controller
                          name={`items.${idx}.eppId`}
                          control={control}
                          render={({ field }) => (
                            <div className="lg:col-span-6 space-y-2">
                              <Label>EPP</Label>
                              <ComboboxEpp value={field.value} onChange={field.onChange} />
                              {errors.items?.[idx]?.eppId && (
                                <p className="text-destructive text-sm">
                                  {errors.items[idx]!.eppId!.message}
                                </p>
                              )}
                            </div>
                          )}
                        />

                        {/* Cantidad y Existencias en la misma fila en móvil */}
                        <div className="lg:col-span-5 grid grid-cols-2 gap-4">
                          {/* Cantidad */}
                          <Controller
                            name={`items.${idx}.quantity`}
                            control={control}
                            render={({ field }) => (
                              <div className="space-y-2">
                                <Label>Cantidad</Label>
                                <Input
                                  type="number"
                                  min={1}
                                  value={field.value ?? ""}
                                  onChange={(e) => field.onChange(Number(e.target.value))}
                                />
                                {errors.items?.[idx]?.quantity && (
                                  <p className="text-destructive text-sm">
                                    {errors.items[idx]!.quantity!.message}
                                  </p>
                                )}
                              </div>
                            )}
                          />

                          {/* Existencias */}
                          <div className="space-y-2">
                            <Label>Existencias</Label>
                            <div className="flex items-center h-10">
                              {!warehouseId ? (
                                <span className="text-sm text-muted-foreground">
                                  Selecciona almacén
                                </span>
                              ) : loading ? (
                                <Loader2 className="animate-spin" />
                              ) : stock !== undefined ? (
                                <div className="flex flex-col gap-1">
                                  <Badge 
                                    variant={
                                      stock === 0 
                                        ? "destructive" 
                                        : stock < (it.quantity || 0) 
                                          ? "secondary" 
                                          : "default"
                                    }
                                    className="w-fit"
                                  >
                                    {stock}
                                  </Badge>
                                  {stock < (it.quantity || 0) && stock > 0 && (
                                    <span className="text-xs text-orange-600 font-medium">
                                      ⚠️ Insuficiente
                                    </span>
                                  )}
                                  {stock === 0 && (
                                    <span className="text-xs text-red-600 font-medium">
                                      ❌ Sin stock
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-sm text-muted-foreground">–</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Eliminar */}
                        <div className="lg:col-span-1 flex justify-end lg:justify-center">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            aria-label="Eliminar ítem"
                            onClick={() => remove(idx)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash size={16} />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Nota y botones - siempre visibles en la parte inferior */}
        <div className="flex-shrink-0 border-t bg-muted/50 p-4 space-y-4">
          {/* Nota */}
          <div className="space-y-2">
            <Label>Nota</Label>
            <Controller
              name="note"
              control={control}
              render={({ field }) => <Textarea rows={2} {...field} />}
            />
          </div>

          {/* Botones de acción */}
          <div className="flex justify-end gap-4">
            {onCancel && (
              <Button 
                type="button"
                variant="outline" 
                onClick={onCancel} 
                disabled={isSubmitting || isPending}
              >
                Cancelar
              </Button>
            )}
            <Button 
              type="submit" 
              disabled={!isValid || isSubmitting || isPending} 
              aria-busy={isSubmitting || isPending}
            >
              {isSubmitting || isPending ? (
                <>
                  <Loader2 className="animate-spin mr-2 h-4 w-4" />
                  Guardando...
                </>
              ) : (
                'Guardar'
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
