"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { eppSchema } from "@/schemas/epp-schema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createEpp, updateEpp } from "@/app/(protected)/epps/actions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { z } from "zod";

type FormValues = z.input<typeof eppSchema>;

export default function EppForm({ defaultValues }: { defaultValues?: FormValues }) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(eppSchema),
    defaultValues: { stock: 0, minStock: 0, ...defaultValues },
  });

  const onSubmit = async (data: FormValues) => {
    const fd = new FormData();
    Object.entries(data).forEach(([k, v]) => fd.append(k, String(v ?? "")));
  
    if (data.id) await updateEpp(fd);
    else await createEpp(fd);
  
    toast.success("EPP guardado");
    router.push("/epps");
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6 max-w-3xl">
      {/* Primer bloque en dos columnas */}
      <div className="grid md:grid-cols-3 gap-4">
        <Input label="Código Interno"    {...register("code")}  error={errors.code?.message} />
        <Input label="Stock Inicial"     {...register("stock")} type="number" min={0} />
        <Input label="Stock Mínimo (Alerta)" {...register("minStock")} type="number" min={0} />
      </div>

      <Input label="Nombre del EPP" {...register("name")} error={errors.name?.message} />
      <Input label="Categoría" {...register("category")} error={errors.category?.message} />

      <Input label="Descripción" {...register("description")} />

      {/* URLs opcionales */}
      <Input label="URL imagen (opcional)" {...register("imageUrl")} />
      <Input label="URL ficha técnica (opcional)" {...register("datasheetUrl")} />

      <div className="flex gap-4">
        <Button type="submit" disabled={isSubmitting}>
          {defaultValues?.id ? "Guardar cambios" : "Crear EPP"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.push("/epps")}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
