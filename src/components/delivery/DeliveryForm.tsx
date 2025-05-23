"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver }        from "@hookform/resolvers/zod";
import { Loader2 }            from "lucide-react";
import { useRouter }          from "next/navigation";
import { toast }              from "sonner";

import { deliverySchema, DeliveryValues } from "@/schemas/delivery-schema";
import { createDelivery }                 from "@/app/(protected)/deliveries/actions";

import ComboboxEpp   from "@/components/ui/ComboboxEpp";
import ComboboxUser  from "@/components/ui/ComboboxUser";
import { Input }     from "@/components/ui/input";
import { Button }    from "@/components/ui/button";
import { Label }     from "@/components/ui/label";
import { Textarea }  from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

type UserOption = { id: number; label: string; email: string };

export default function DeliveryForm({
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
  } = useForm<DeliveryValues>({
    resolver: zodResolver(deliverySchema),
    mode: "onChange",
    defaultValues: {
      eppId:    defaultEppId,
      employee: "",
      quantity: 1,
      note:     "",
    },
  });

  const onSubmit = async (data: DeliveryValues) => {
    const fd = new FormData();
    Object.entries(data).forEach(([k, v]) => fd.append(k, String(v)));
    try {
      await createDelivery(fd);
      toast.success("Entrega registrada");
      router.push("/deliveries");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al registrar entrega";
      toast.error(message);
    }
  };

  return (
    <Card>
      <CardHeader><CardTitle>Registrar Entrega</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6">
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

          {/* Receptor (employee) */}
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

          {/* Cantidad */}
          <div className="space-y-1">
            <Label>Cantidad</Label>
            <Input type="number" min={1} step={1} {...register("quantity", { valueAsNumber: true })} />
            {errors.quantity && <p className="text-destructive text-sm">{errors.quantity.message}</p>}
          </div>

          {/* Nota */}
          <div className="space-y-1">
            <Label>Nota (opcional)</Label>
            <Textarea rows={3} {...register("note")} />
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-4 pt-4">
            <Button variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!isValid || isSubmitting} className="flex items-center">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
