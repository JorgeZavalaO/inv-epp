"use client";

import * as React from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Trash } from "lucide-react";
import { deliveryBatchSchema, DeliveryBatchValues } from "@/schemas/delivery-batch-schema";
import { createDeliveryBatch } from "@/app/(protected)/deliveries/actions";

import ComboboxEpp from "@/components/ui/ComboboxEpp";
import ComboboxUser from "@/components/ui/ComboboxUser";
import ComboboxWarehouse from "@/components/ui/ComboboxWarehouse";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type UserOption = { id: number; label: string; email: string };
type WarehouseOption = { id: number; label: string };

export default function DeliveryBatchForm({
  users,
  warehouses,
}: {
  users: UserOption[];
  warehouses: WarehouseOption[];
}) {
  const router = useRouter();

  const {
    control,
    handleSubmit,
    formState: { isSubmitting, isValid, errors },
    watch,
  } = useForm<DeliveryBatchValues>({
    resolver: zodResolver(deliveryBatchSchema),
    mode: "onChange",
    defaultValues: {
      employee: "",
      note: "",
      items: [
        {
          eppId: undefined,
          warehouseId: undefined,
          quantity: 1,
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const items = watch("items");

  // Map: "<eppId>-<warehouseId>" → stock quantity
  const [stockMap, setStockMap] = React.useState<Record<string, number>>({});

  // Whenever items change, fetch stock for each (eppId, warehouseId) pair if not already cached:
  React.useEffect(() => {
    items.forEach((it) => {
      if (typeof it.eppId === "number" && typeof it.warehouseId === "number") {
        const key = `${it.eppId}-${it.warehouseId}`;
        if (stockMap[key] === undefined) {
          // Fire‐and‐forget: fetch current stock from our API:
          (async () => {
            try {
              const stockRes = await fetch(
                `/api/epp-stocks?eppId=${it.eppId}&warehouseId=${it.warehouseId}`,
                { cache: "no-store" }
              );
              if (!stockRes.ok) throw new Error();
              const { quantity } = await stockRes.json(); // { quantity }
              setStockMap((prev) => ({ ...prev, [key]: quantity }));
            } catch {
              // On any failure, set to 0:
              setStockMap((prev) => ({ ...prev, [key]: 0 }));
            }
          })();
        }
      }
    });
  }, [items, stockMap]);

  const onSubmit = async (values: DeliveryBatchValues) => {
    const fd = new FormData();
    fd.append("payload", JSON.stringify(values));

    try {
      await createDeliveryBatch(fd);
      toast.success("Entrega registrada");
      router.push("/deliveries");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al registrar";
      toast.error(msg);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="grid gap-6 max-w-3xl mx-auto py-6"
    >
      {/*==========================
      |  1) Empleado receptor
      ==========================*/}
      <Controller
        name="employee"
        control={control}
        render={({ field }) => (
          <div className="space-y-1">
            <Label>Empleado receptor</Label>
            <ComboboxUser
              value={users.find((u) => u.label === field.value)?.id ?? null}
              onChange={(id) => {
                const found = users.find((u) => u.id === id);
                field.onChange(found?.label ?? "");
              }}
              options={users.map((u) => ({ id: u.id, label: u.label, email: u.email }))}
            />
            {errors.employee && (
              <p className="text-destructive text-sm">{errors.employee.message}</p>
            )}
          </div>
        )}
      />

      {/*==========================
      |  2) Items dinámicos
      ==========================*/}
      <div className="space-y-4">
        {fields.map((f, idx) => {
          const thisItem = items[idx];
          const keyMap =
            typeof thisItem.eppId === "number" && typeof thisItem.warehouseId === "number"
              ? `${thisItem.eppId}-${thisItem.warehouseId}`
              : "";
          const currentStock = stockMap[keyMap] ?? null;

          return (
            <div key={f.id} className="grid grid-cols-12 gap-2 items-end">
              {/* 2.a) Seleccionar EPP */}
              <Controller
                name={`items.${idx}.eppId`}
                control={control}
                render={({ field }) => (
                  <div className="col-span-4 space-y-1">
                    <Label>EPP</Label>
                    <ComboboxEpp
                      value={field.value}
                      onChange={field.onChange}
                    />
                    {errors.items?.[idx]?.eppId && (
                      <p className="text-destructive text-sm">
                        {errors.items[idx]?.eppId?.message}
                      </p>
                    )}
                  </div>
                )}
              />

              {/* 2.b) Seleccionar Almacén */}
              <Controller
                name={`items.${idx}.warehouseId`}
                control={control}
                render={({ field }) => (
                  <div className="col-span-3 space-y-1">
                    <Label>Almacén</Label>
                    <ComboboxWarehouse
                      value={field.value ?? null}
                      onChange={field.onChange}
                      options={warehouses}
                    />
                    {errors.items?.[idx]?.warehouseId && (
                      <p className="text-destructive text-sm">
                        {errors.items[idx]?.warehouseId?.message}
                      </p>
                    )}
                  </div>
                )}
              />

              {/* 2.c) Cantidad */}
              <div className="col-span-2 space-y-1">
                <Label>Cantidad</Label>
                <Controller
                  name={`items.${idx}.quantity`}
                  control={control}
                  render={({ field }) => (
                    <Input
                      type="number"
                      min={1}
                      step={1}
                      {...field}
                    />
                  )}
                />
                {errors.items?.[idx]?.quantity && (
                  <p className="text-destructive text-sm">
                    {errors.items[idx]?.quantity?.message}
                  </p>
                )}
              </div>

              {/* 2.d) Stock actual */}
              <div className="col-span-2 space-y-1">
                <Label>Exist.</Label>
                {currentStock !== null ? (
                  <Badge
                    variant={
                      currentStock === 0 ? "destructive" : "secondary"
                    }
                  >
                    {currentStock}
                  </Badge>
                ) : (
                  <span className="text-sm text-muted-foreground">–</span>
                )}
              </div>

              {/* 2.e) Botón Eliminar */}
              <div className="col-span-1 flex justify-end">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => remove(idx)}
                  aria-label="Eliminar renglón"
                >
                  <Trash size={16} />
                </Button>
              </div>
            </div>
          );
        })}

        {/* 2.f) Botón para agregar renglón */}
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            append({ eppId: 0, warehouseId: 0, quantity: 1 })
          }
        >
          <Plus size={16} className="mr-1" /> Añadir ítem
        </Button>
      </div>

      {/*==========================
      |  3) Nota (opcional)
      ==========================*/}
      <div className="space-y-1">
        <Label>Nota (opcional)</Label>
        <Controller
          name="note"
          control={control}
          render={({ field }) => (
            <Textarea {...field} rows={3} />
          )}
        />
      </div>

      {/*==========================
      |  4) Acciones: Cancelar / Guardar
      ==========================*/}
      <div className="flex justify-end gap-4 pt-4">
        <Button
          variant="outline"
          type="button"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={!isValid || isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Guardar
        </Button>
      </div>
    </form>
  );
}
