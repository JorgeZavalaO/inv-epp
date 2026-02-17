"use client";

import * as React from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import ComboboxBatch from "@/components/ui/ComboboxBatch";
import ComboboxWarehouse from "@/components/ui/ComboboxWarehouse";
import { Input }     from "@/components/ui/input";
import { Textarea }  from "@/components/ui/textarea";
import { Button }    from "@/components/ui/button";
import { Label }     from "@/components/ui/label";

import {
  returnBatchSchema,
  type ReturnBatchValues,
} from "@/schemas/return-schema";

/* ---------- tipo que recibe fetchDetails ---------- */
export interface DetailRow {
  eppId:         number;
  warehouseId:   number;
  warehouseName: string;
  delivered:     number;
  code:          string;
  name:          string;
}

/* -------------------------------------------------- */
interface Props {
  batches: { id: number; code: string; date: string }[];
  fetchDetails(batchId: number): Promise<DetailRow[]>;
  onSubmit(values: ReturnBatchValues): void;
}
/* -------------------------------------------------- */

export default function ReturnForm({
  batches,
  fetchDetails,
  onSubmit,
}: Props) {
  const {
    control,
    handleSubmit,
    register,
    setValue,
    watch,
    formState: { errors, isValid, isSubmitting },
  } = useForm<ReturnBatchValues>({
    resolver: zodResolver(returnBatchSchema),
    mode: "onChange",
    defaultValues: { items: [], warehouseId: 0 },
  });

  const batchId = watch("batchId");
  const { fields, replace, remove } = useFieldArray({ control, name: "items" });
  const [warehouseName, setWarehouseName] = React.useState("");
  const [warehouseOptions, setWarehouseOptions] = React.useState<
    { id: number; label: string }[]
  >([]);

  React.useEffect(() => {
    let isMounted = true;
    fetch("/api/warehouses")
      .then((res) => res.json())
      .then((list: Array<{ id: number; name: string }>) => {
        if (!isMounted) return;
        setWarehouseOptions(list.map((warehouse) => ({ id: warehouse.id, label: warehouse.name })));
      })
      .catch(() => {
        if (!isMounted) return;
        setWarehouseOptions([]);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  /* ─────────── cargar detalles cuando cambia el lote ─────────── */
  React.useEffect(() => {
    if (!batchId) {
      console.log("[ReturnForm] Sin batchId seleccionado, limpiando formulario");
      setWarehouseName("");
      setValue("warehouseId", 0, { shouldValidate: true });
      replace([]);
      return;
    }

    console.log(`[ReturnForm] Cargando detalles para batchId=${batchId}`);
    fetchDetails(batchId)
      .then((rows) => {
        console.log(`[ReturnForm] fetchDetails retornó ${rows.length} items:`, rows);
        if (rows.length === 0) {
          console.warn(`[ReturnForm] No se cargaron items para batchId=${batchId}`);
          setWarehouseName("");
          setValue("warehouseId", 0, { shouldValidate: true });
          replace([]);
          return;
        }

        setWarehouseName(rows[0].warehouseName);
        setValue("warehouseId", rows[0].warehouseId, { shouldValidate: true });

        /* construimos SÓLO las props contempladas por el schema */
        replace(
          rows.map((r) => ({
            eppId:       r.eppId,
            warehouseId: r.warehouseId,
            delivered:   r.delivered,
            quantity:    0,
            code:        r.code,
            name:        r.name,
          })),
        );
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : "Error al cargar los detalles de la entrega";
        console.error("[ReturnForm] fetchDetails error:", err);
        toast.error(msg);
        setWarehouseName("");
        setValue("warehouseId", 0, { shouldValidate: true });
        replace([]);
      });
  }, [batchId, fetchDetails, replace, setValue]);

  /* --------------------------- UI --------------------------- */
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6">

      {/* selector de pedido ------------------------------------------------ */}
      <Controller
        name="batchId"
        control={control}
        render={({ field }) => (
          <div className="space-y-1">
            <Label>Entrega</Label>
            <ComboboxBatch
              options={batches}
              value={field.value ?? null}
              onChange={field.onChange}
            />
            {errors.batchId && (
              <p className="text-destructive text-sm">{errors.batchId.message}</p>
            )}
          </div>
        )}
      />

      {/* almacén ----------------------------------------------------------- */}
      <div className="space-y-1">
        <Label>Almacén destino</Label>
        <Controller
          name="warehouseId"
          control={control}
          render={({ field }) => (
            <ComboboxWarehouse
              value={field.value ?? null}
              onChange={(value) => field.onChange(value)}
              options={warehouseOptions}
              disabled={warehouseOptions.length === 0}
            />
          )}
        />
        {warehouseName && (
          <p className="text-xs text-muted-foreground">
            Almacén original: {warehouseName}
          </p>
        )}
        {warehouseOptions.length === 0 && (
          <p className="text-xs text-muted-foreground">Cargando almacenes...</p>
        )}
      </div>

      {/* condición --------------------------------------------------------- */}
      <div className="space-y-1">
        <Label>Condición</Label>
        <select
          {...register("condition")}
          className="block w-full rounded border px-3 py-2"
        >
          <option value="REUSABLE">Reutilizable</option>
          <option value="DISCARDED">Descartado</option>
        </select>
        {errors.condition && (
          <p className="text-destructive text-sm">{errors.condition.message}</p>
        )}
      </div>

      {/* tabla ------------------------------------------------------------- */}
      <div className="space-y-2">
        <div className="grid grid-cols-12 gap-2 text-sm font-semibold text-muted-foreground">
          <div className="col-span-3">Código</div>
          <div className="col-span-4">Nombre</div>
          <div className="col-span-2 text-center">Entregado</div>
          <div className="col-span-2 text-center">Devolver</div>
          <div className="col-span-1 text-right text-xs text-muted-foreground">
            Acciones
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Elimina las líneas que no quieras devolver o ajusta sus cantidades antes de enviar.
        </p>

        <div className="rounded-lg border bg-card shadow-sm divide-y">
          {fields.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              Selecciona un lote para ver los productos disponibles, luego ajusta las cantidades que sí deseas devolver.
            </p>
          ) : (
            fields.map((f, idx) => (
              <div
                key={f.id}
                className="grid grid-cols-12 items-center gap-2 p-3 even:bg-transparent odd:bg-white"
              >
                <span className="col-span-3 font-medium">{f.code}</span>
                <span className="col-span-4 text-sm text-muted-foreground">{f.name}</span>
                <span className="col-span-2 text-center text-sm">{f.delivered}</span>
                <Controller
                  name={`items.${idx}.quantity`}
                  control={control}
                  render={({ field }) => (
                    <div className="col-span-2 flex flex-col items-center">
                      <Input
                        type="number"
                        min={0}
                        max={f.delivered}
                        className="text-center"
                        {...field}
                      />
                      {errors.items?.[idx]?.quantity && (
                        <p className="text-destructive text-xs mt-1">
                          {errors.items[idx]!.quantity!.message}
                        </p>
                      )}
                    </div>
                  )}
                />
                <div className="col-span-1 flex justify-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={isSubmitting}
                    onClick={() => remove(idx)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Quitar producto</span>
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* nota -------------------------------------------------------------- */}
      <div className="space-y-1">
        <Label>Nota (opcional)</Label>
        <Textarea rows={2} {...register("note")} />
      </div>

      {/* acción ------------------------------------------------------------ */}
      <div className="flex justify-end pt-4">
        <Button
          type="submit"
          disabled={!isValid || isSubmitting}
          className="flex items-center"
        >
          {isSubmitting && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
          Devolver
        </Button>
      </div>
    </form>
  );
}
