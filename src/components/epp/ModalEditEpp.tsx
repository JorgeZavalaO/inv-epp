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
import { updateEpp } from "@/app/(protected)/epps/actions";
import type { z } from "zod";
import { toast } from "sonner";

// El tipo FormValues se infiere del schema
type FormValues = z.infer<typeof eppSchema>;

export default function ModalEditEpp({
  epp,
  onClose,
}: {
  epp: {
    id: number;
    code: string;
    name: string;
    category: string;
    description: string | null;
    minStock: number;
    warehouseId: number | null;
    initialQty: number | null;
  };
  onClose: () => void;
}) {
  const [warehouses, setWarehouses] = useState<{ id: number; name: string }[]>(
    []
  );

  // Al cargar el modal, traemos la lista de almacenes para el <select>
  useEffect(() => {
    fetch("/api/warehouses")
      .then((res) => res.json())
      .then(setWarehouses)
      .catch(() => {
        // No hacemos nada si falla
      });
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
  } = useForm<FormValues>({
    resolver: zodResolver(eppSchema),

    // defaultValues incluyen ID, warehouseId y initialQty para que la select
    // muestre el almacén actual y el input muestre la cantidad actual
    defaultValues: {
      id: epp.id,
      code: epp.code,
      name: epp.name,
      category: epp.category,
      description: epp.description ?? "",
      minStock: epp.minStock,
      warehouseId: epp.warehouseId ?? undefined,
      initialQty: epp.initialQty ?? undefined,
    },
    mode: "onChange",
  });

  const onSubmit = async (data: FormValues) => {
    // Construir FormData: Zod ya nos convenció que 'id', 'warehouseId'
    // y 'initialQty' vienen todos como números (gracias a z.coerce.number)
    const fd = new FormData();
    Object.entries(data).forEach(([k, v]) => fd.append(k, String(v ?? "")));

    try {
      await updateEpp(fd);
      toast.success("EPP actualizado");
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al actualizar");
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar EPP</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
          {/* ◀︎ Input hidden para que el ID entre en FormData ya como número */}
          <input type="hidden" {...register("id", { valueAsNumber: true })} />

          {/* Código (no editable) */}
          <Input disabled value={epp.code} label="Código" />

          {/* Nombre */}
          <Input {...register("name")} label="Nombre" />
          {errors.name && <p className="text-destructive text-sm">{errors.name.message}</p>}

          {/* Categoría */}
          <Input {...register("category")} label="Categoría" />
          {errors.category && <p className="text-destructive text-sm">{errors.category.message}</p>}

          {/* Descripción */}
          <Input {...register("description")} label="Descripción" />

          {/* Stock mínimo */}
          <Input
            type="number"
            {...register("minStock", { valueAsNumber: true })}
            label="Stock mínimo"
          />
          {errors.minStock && <p className="text-destructive text-sm">{errors.minStock.message}</p>}

          {/* ► Select de almacén ◀︎ */}
          <select
            {...register("warehouseId", { valueAsNumber: true })}
            className="rounded-md border px-3 py-2 text-sm focus:ring-2 focus:ring-ring"
          >
            <option value="">Almacén (opcional)</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
          {errors.warehouseId && <p className="text-destructive text-sm">{errors.warehouseId.message}</p>}

          {/* ► Cantidad inicial ◀︎ */}
          <Input
            type="number"
            {...register("initialQty", { valueAsNumber: true })}
            label="Cantidad inicial (opcional)"
          />
          {errors.initialQty && <p className="text-destructive text-sm">{errors.initialQty.message}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || !isValid}>
              Guardar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
