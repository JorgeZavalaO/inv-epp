"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { eppSchema } from "@/schemas/epp-schema";
import type { z } from "zod";
import { createEpp, updateEpp } from "@/app/(protected)/epps/actions";
import { getNextEppCode } from "@/lib/next-epp-code";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

// Tipo inferido automáticamente a partir del schema
type EppFormValues = z.infer<typeof eppSchema>;

export default function EppForm({ defaultValues }: { defaultValues?: EppFormValues }) {
  const router = useRouter();
  const [autoCode, setAutoCode] = React.useState<string>("");

  // Si no hay defaultValues (modo crear), buscar próximo código
  React.useEffect(() => {
    if (!defaultValues?.id) {
      getNextEppCode()
        .then((code) => setAutoCode(code))
        .catch(() => {});
    }
  }, [defaultValues]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
    setValue,
  } = useForm<EppFormValues>({
    resolver: zodResolver(eppSchema),
    defaultValues: defaultValues
      ? defaultValues
      : {
          code: autoCode,
          name: "",
          category: "",
          description: "",
          minStock: 1,
          imageUrl: "",
          datasheetUrl: "",
        },
    mode: "onChange",
  });

  // Si cambia el autoCode después de obtenerlo, setea en el form
  React.useEffect(() => {
    if (!defaultValues?.id && autoCode) {
      setValue("code", autoCode);
    }
  }, [autoCode, defaultValues?.id, setValue]);

  const onSubmit = async (data: EppFormValues) => {
    // Si estamos en creación, asegurar que el código sea el auto generado más reciente
    if (!data.id) {
      data.code = autoCode;
    }

    const fd = new FormData();
    Object.entries(data).forEach(([k, v]) => fd.append(k, String(v ?? "")));

    try {
      if (data.id) {
        await updateEpp(fd);
        toast.success("EPP actualizado");
      } else {
        await createEpp(fd);
        toast.success("EPP creado");
      }
      router.push("/epps");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error inesperado";
      toast.error(msg);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6 max-w-lg mx-auto">
      {/* Campo Código */}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">Código</label>
        <Input
          type="text"
          disabled
          {...register("code")}
          className="bg-gray-100"
        />
        {errors.code && <p className="text-destructive text-sm">{errors.code.message}</p>}
      </div>

      {/* Campo Nombre */}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">Nombre del EPP</label>
        <Input {...register("name")} />
        {errors.name && <p className="text-destructive text-sm">{errors.name.message}</p>}
      </div>

      {/* Campo Categoría */}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">Categoría</label>
        <Input {...register("category")} />
        {errors.category && <p className="text-destructive text-sm">{errors.category.message}</p>}
      </div>

      {/* Campo Descripción (opcional) */}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">Descripción (opcional)</label>
        <Input {...register("description")} />
      </div>

      {/* Campo Stock mínimo */}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">Stock mínimo (alerta)</label>
        <Input
          type="number"
          min={0}
          {...register("minStock", { valueAsNumber: true })}
        />
        {errors.minStock && <p className="text-destructive text-sm">{errors.minStock.message}</p>}
      </div>

      {/* Campo URL imagen (opcional) */}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">URL imagen (opcional)</label>
        <Input {...register("imageUrl")} />
        {errors.imageUrl && <p className="text-destructive text-sm">{errors.imageUrl.message}</p>}
      </div>

      {/* Campo URL ficha técnica (opcional) */}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">URL ficha técnica (opcional)</label>
        <Input {...register("datasheetUrl")} />
        {errors.datasheetUrl && <p className="text-destructive text-sm">{errors.datasheetUrl.message}</p>}
      </div>

      {/* Botones */}
      <div className="flex gap-4 pt-4">
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting || !isValid}>
          {isSubmitting ? "Guardando…" : defaultValues?.id ? "Guardar cambios" : "Crear EPP"}
        </Button>
      </div>
    </form>
  );
}
