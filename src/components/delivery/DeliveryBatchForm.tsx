"use client";

import * as React from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Trash } from "lucide-react";

import { DeliveryBatchValues, deliveryBatchSchema } from "@/schemas/delivery-batch-schema";
import ComboboxCollaborator     from "@/components/ui/ComboboxCollaborator";
import ComboboxWarehouse        from "@/components/ui/ComboboxWarehouse";
import ComboboxEpp              from "@/components/ui/ComboboxEpp";
import { Label }                from "@/components/ui/label";
import { Input }                from "@/components/ui/input";
import { Textarea }             from "@/components/ui/textarea";
import { Button }               from "@/components/ui/button";
import { Badge }                from "@/components/ui/badge";

export default function DeliveryBatchForm({
  collaborators,
  warehouses,
  defaultValues,
  onSubmit,
}: {
  collaborators: { id: number; label: string; position?: string; location?: string }[];
  warehouses:    { id: number; label: string }[];
  defaultValues?: DeliveryBatchValues;
  onSubmit(values: DeliveryBatchValues): void;
}) {
  const {
    control,
    handleSubmit,
    watch,
    formState: { isSubmitting, errors, isValid },
  } = useForm<DeliveryBatchValues>({
    resolver:    zodResolver(deliveryBatchSchema),
    mode:        "onChange",
    defaultValues: defaultValues ?? {
      collaboratorId: undefined,
      warehouseId:    undefined,
      note:           "",
      items:         [{ eppId: undefined!, quantity: 1 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const values = watch();
  const [stockMap, setStockMap] = React.useState<Record<string, number>>({});

  // Carga de existencias usando siempre warehouseId global
  React.useEffect(() => {
    if (!values.warehouseId) return;
    fields.forEach((f, idx) => {
      const eppId = values.items[idx].eppId;
      if (eppId) {
        const key = `${eppId}-${values.warehouseId}`;
        if (stockMap[key] == null) {
          fetch(`/api/epp-stocks?eppId=${eppId}&warehouseId=${values.warehouseId}`)
            .then((r) => r.json())
            .then(({ quantity }: { quantity: number }) =>
              setStockMap((m) => ({ ...m, [key]: quantity }))
            )
            .catch(() =>
              setStockMap((m) => ({ ...m, [key]: 0 }))
            );
        }
      }
    });
  }, [values.warehouseId, values.items, fields, stockMap]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6">
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
            <ComboboxWarehouse
              value={field.value ?? null}
              onChange={field.onChange}
              options={warehouses}
            />
            {errors.warehouseId && (
              <p className="text-destructive text-sm">
                {errors.warehouseId.message}
              </p>
            )}
          </div>
        )}
      />

      {/* Ítems dinámicos */}
      <div className="space-y-4">
        {fields.map((f, idx) => {
          const eppId = values.items[idx].eppId;
          const key   = `${eppId}-${values.warehouseId}`;
          const stock = stockMap[key];

          return (
            <div key={f.id} className="grid grid-cols-12 gap-2 items-end">
              {/* EPP */}
              <Controller
                name={`items.${idx}.eppId`}
                control={control}
                render={({ field }) => (
                  <div className="col-span-6 space-y-1">
                    <Label>EPP</Label>
                    <ComboboxEpp value={field.value} onChange={field.onChange} />
                    {errors.items?.[idx]?.eppId && (
                      <p className="text-destructive text-sm">
                        {errors.items![idx]!.eppId!.message}
                      </p>
                    )}
                  </div>
                )}
              />

              {/* Cantidad */}
              <Controller
                name={`items.${idx}.quantity`}
                control={control}
                render={({ field }) => (
                  <div className="col-span-3 space-y-1">
                    <Label>Cant.</Label>
                    <Input type="number" min={1} {...field} />
                    {errors.items?.[idx]?.quantity && (
                      <p className="text-destructive text-sm">
                        {errors.items![idx]!.quantity!.message}
                      </p>
                    )}
                  </div>
                )}
              />

              {/* Existencias */}
              <div className="col-span-2 space-y-1">
                <Label>Exist.</Label>
                {values.warehouseId ? (
                  stock != null ? (
                    <Badge variant={stock === 0 ? "destructive" : "secondary"}>
                      {stock}
                    </Badge>
                  ) : (
                    <span className="text-sm text-muted-foreground">–</span>
                  )
                ) : (
                  <span className="text-sm text-muted-foreground">Selecciona almacén</span>
                )}
              </div>

              {/* Eliminar ítem */}
              <div className="col-span-1 flex justify-end">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => remove(idx)}
                >
                  <Trash size={16} />
                </Button>
              </div>
            </div>
          );
        })}

        <Button
          variant="outline"
          onClick={() => append({ eppId: undefined!, quantity: 1 })}
        >
          <Plus size={16} className="mr-1" /> Añadir ítem
        </Button>
      </div>

      {/* Nota */}
      <div className="space-y-1">
        <Label>Nota</Label>
        <Controller
          name="note"
          control={control}
          render={({ field }) => <Textarea rows={3} {...field} />}
        />
      </div>

      {/* Acciones */}
      <div className="flex justify-end gap-4 pt-4">
        <Button variant="outline" type="reset" disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={!isValid || isSubmitting}
          aria-busy={isSubmitting}
        >
          {isSubmitting && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
          Guardar
        </Button>
      </div>
    </form>
  );
}
