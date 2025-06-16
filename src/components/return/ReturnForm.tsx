"use client";

import * as React from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";

import ComboboxBatch from "@/components/ui/ComboboxBatch";
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
    defaultValues: { items: [] },
  });

  const batchId = watch("batchId");
  const { fields, replace } = useFieldArray({ control, name: "items" });
  const [warehouseName, setWarehouseName] = React.useState("");

  /* ─────────── cargar detalles cuando cambia el lote ─────────── */
  React.useEffect(() => {
    if (!batchId) return;

    fetchDetails(batchId).then((rows) => {
      if (rows.length === 0) return;

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
            <Label>Pedido</Label>
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
      {warehouseName && (
        <div>
          <Label>Almacén</Label>
          <p className="rounded border px-3 py-2 bg-gray-50">{warehouseName}</p>
        </div>
      )}

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
      <div className="grid grid-cols-12 gap-2 font-semibold text-sm">
        <div className="col-span-4">Código</div>
        <div className="col-span-4">Nombre</div>
        <div className="col-span-2 text-center">Entregado</div>
        <div className="col-span-2 text-center">Devolver</div>
      </div>

      <div className="max-h-64 overflow-y-auto space-y-1">
        {fields.map((f, idx) => (
          <div
            key={f.id}
            className="grid grid-cols-12 items-center gap-2 p-2 rounded hover:bg-gray-50"
          >
            <span className="col-span-4">{f.code}</span>
            <span className="col-span-4">{f.name}</span>
            <span className="col-span-2 text-center">{f.delivered}</span>

            <Controller
              name={`items.${idx}.quantity`}
              control={control}
              render={({ field }) => (
                <div className="col-span-2">
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
          </div>
        ))}
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
