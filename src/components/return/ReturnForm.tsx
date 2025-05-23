"use client";
import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { returnSchema, ReturnValues } from "@/schemas/return-schema";
import { createReturn } from "@/app/(protected)/returns/actions";

import ComboboxEpp  from "@/components/ui/ComboboxEpp";
import ComboboxUser from "@/components/ui/ComboboxUser";
import { Input }   from "@/components/ui/input";
import { Button }  from "@/components/ui/button";
import { Label }   from "@/components/ui/label";
import { Textarea }from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

type UserOption = { id: number; label: string; email: string };

export default function ReturnForm({
  defaultEppId,
  users,
}: {
  defaultEppId?: number;
  users: UserOption[];
}) {
  const router = useRouter();
  const {
    handleSubmit, control, register,
    formState: { isSubmitting, errors, isValid }
  } = useForm<ReturnValues>({
    resolver: zodResolver(returnSchema),
    mode: "onChange",
    defaultValues: {
      eppId: defaultEppId,
      employee: "",
      quantity: 1,
      condition: "REUSABLE",
      note: "",
    },
  });

  const onSubmit = async (data: ReturnValues) => {
    const fd = new FormData();
    Object.entries(data).forEach(([k, v]) => fd.append(k, String(v ?? "")));
    try {
      await createReturn(fd);
      toast.success("Devolución registrada");
      router.push("/returns");
    } catch (e: unknown) {
      if (e instanceof Error) {
        toast.error(e.message || "Error");
      } else {
        toast.error("Error");
      }
    }
  };

  return (
    <Card>
      <CardHeader><CardTitle>Registrar Devolución</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
          {/* EPP */}
          <Controller
            name="eppId"
            control={control}
            render={({ field }) => (
              <div className="space-y-1">
                <Label>EPP</Label>
                <ComboboxEpp value={field.value} onChange={field.onChange} />
                {errors.eppId && <p className="text-destructive text-sm">{errors.eppId.message}</p>}
              </div>
            )}
          />

          {/* Empleado (receptor) */}
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
                  options={users}
                />
                {errors.employee && <p className="text-destructive text-sm">{errors.employee.message}</p>}
              </div>
            )}
          />

          {/* Cantidad + Condición */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Cantidad</Label>
              <Input type="number" inputMode="numeric" step={1} min={1} {...register("quantity", { valueAsNumber:true })} />
              {errors.quantity && <p className="text-destructive text-sm">{errors.quantity.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Condición</Label>
              <select {...register("condition")} className="block w-full rounded border px-3 py-2">
                <option value="REUSABLE">Reutilizable</option>
                <option value="DISCARDED">Descartado</option>
              </select>
            </div>
          </div>

          {/* Nota */}
          <div className="space-y-1">
            <Label>Nota (opcional)</Label>
            <Textarea rows={3} {...register("note")} />
          </div>

          {/* Acciones */}
          <div className="flex gap-4 pt-2">
            <Button variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || !isValid} className="flex items-center">
              {isSubmitting && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
              {isSubmitting ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
