"use client";

import * as React from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import ComboboxBatch from "@/components/ui/ComboboxBatch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  returnBatchSchema,
  type ReturnBatchValues,
} from "@/schemas/return-schema";

interface Props {
  batches: { id: number; code: string; date: string }[];
  fetchDetails(
    batchId: number
  ): Promise<
    {
      eppId: number;
      warehouseId: number;
      delivered: number;
      code: string;
      name: string;
    }[]
  >;
  onSubmit(data: ReturnBatchValues): void;
}

export default function ReturnForm({
  batches,
  fetchDetails,
  onSubmit,
}: Props) {
  const {
    control,
    handleSubmit,
    register,
    watch,
    formState: { errors, isValid, isSubmitting },
  } = useForm<ReturnBatchValues>({
    resolver: zodResolver(returnBatchSchema),
    mode: "onChange",
  });

  const batchId = watch("batchId");
  const { fields, replace } = useFieldArray<ReturnBatchValues, "items">({
    control,
    name: "items",
  });

  // Cargar detalles cada vez que batchId cambie
  React.useEffect(() => {
    if (!batchId) return;
    fetchDetails(batchId).then((rows) =>
      replace(
        rows.map((r) => ({
          eppId: r.eppId,
          warehouseId: r.warehouseId,
          delivered: r.delivered,
          quantity: 0,
          code: r.code,
          name: r.name,
        }))
      )
    );
  }, [batchId, fetchDetails, replace]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6">
      {/* Selector de lote */}
      <Controller
        name="batchId"
        control={control}
        render={({ field }) => (
          <div className="space-y-1">
            <Label>Lote de entrega</Label>
            <ComboboxBatch
              options={batches}
              value={field.value ?? null}
              onChange={field.onChange}
            />
            {errors.batchId && (
              <p className="text-destructive text-sm">
                {errors.batchId.message}
              </p>
            )}
          </div>
        )}
      />

      {/* Encabezados de tabla */}
      <div className="grid grid-cols-12 gap-2 font-semibold text-sm">
        <div className="col-span-4">Código</div>
        <div className="col-span-4">Nombre</div>
        <div className="col-span-2 text-center">Entregado</div>
        <div className="col-span-2 text-center">Devolver</div>
      </div>

      {/* Lista de ítems */}
      <div className="max-h-72 overflow-y-auto space-y-1">
        {fields.map((f, idx) => (
          <div
            key={f.id}
            className="grid grid-cols-12 gap-2 items-center p-2 rounded hover:bg-gray-50"
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

      {/* Nota opcional */}
      <div className="space-y-1">
        <Label>Nota (opcional)</Label>
        <Textarea rows={2} {...register("note")} />
      </div>

      {/* Botón de devolución */}
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
