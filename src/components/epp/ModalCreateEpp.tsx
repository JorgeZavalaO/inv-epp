"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { eppSchema } from "@/schemas/epp-schema";
import { createEpp } from "@/app/(protected)/epps/actions";
import { getNextEppCode } from "@/lib/next-epp-code";
import type { z } from "zod";
import { toast } from "sonner";

type FormValues = z.infer<typeof eppSchema>;

export default function ModalCreateEpp({ onClose }: { onClose: () => void }) {
  const [autoCode, setAutoCode] = useState<string>("");
  const [warehouses, setWarehouses] = useState<{ id: number; name: string }[]>(
    []
  );

  /* ── Cargar código y lista de almacenes ── */
  useEffect(() => {
    getNextEppCode().then(setAutoCode).catch(() => {});
    fetch("/api/warehouses")
      .then((res) => res.json())
      .then(setWarehouses)
      .catch(() => {});
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
  } = useForm<FormValues>({
    resolver: zodResolver(eppSchema),
    defaultValues: {
      code: autoCode,
      name: "",
      category: "",
      description: "",
      minStock: 1,
      warehouseId: undefined,
      initialQty: 0,
    },
    mode: "onChange",
  });

  const onSubmit = async (data: FormValues) => {
    // Construir FormData incluyendo code forzado
    const fd = new FormData();
    Object.entries({ ...data, code: autoCode }).forEach(([k, v]) =>
      fd.append(k, String(v ?? ""))
    );

    try {
      await createEpp(fd);
      toast.success("EPP creado correctamente");
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al crear EPP");
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar nuevo EPP</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
          {/* Código (autogenerado) */}
          <Input disabled value={autoCode} label="Código" />

          {/* Nombre */}
          <Input {...register("name")} label="Nombre" />
          {errors.name && (
            <p className="text-destructive text-sm">{errors.name.message}</p>
          )}

          {/* Categoría */}
          <Input {...register("category")} label="Categoría" />
          {errors.category && (
            <p className="text-destructive text-sm">
              {errors.category.message}
            </p>
          )}

          {/* Descripción */}
          <Input {...register("description")} label="Descripción" />

          {/* Stock mínimo */}
          <Input
            type="number"
            {...register("minStock", { valueAsNumber: true })}
            label="Stock mínimo"
          />
          {errors.minStock && (
            <p className="text-destructive text-sm">
              {errors.minStock.message}
            </p>
          )}

          {/* Almacén inicial */}
          <select
            {...register("warehouseId", { valueAsNumber: true })}
            className="rounded-md border px-3 py-2 text-sm focus:ring-2 focus:ring-ring"
          >
            <option value="">Almacén inicial (opcional)</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
          {errors.warehouseId && (
            <p className="text-destructive text-sm">
              {errors.warehouseId.message}
            </p>
          )}

          {/* Cantidad inicial */}
          <Input
            type="number"
            {...register("initialQty", { valueAsNumber: true })}
            label="Cantidad inicial (opcional)"
          />
          {errors.initialQty && (
            <p className="text-destructive text-sm">
              {errors.initialQty.message}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || !isValid}>
              Crear
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
