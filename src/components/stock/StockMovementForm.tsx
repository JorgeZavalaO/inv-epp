"use client";
import { stockMovementSchema, MovementValues } from "@/schemas/stock-movement-schema";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import ComboboxEpp from "@/components/ui/ComboboxEpp";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createMovement } from "@/app/(protected)/stock-movements/actions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Label } from "@/components/ui/label"; // Asegúrate de que existe este componente
import { Textarea } from "@/components/ui/textarea"; // Asegúrate de que existe este componente

export default function StockMovementForm() {
  const router = useRouter();
  const {
    handleSubmit,
    control,
    register,
    formState: { isSubmitting, errors, isValid },
    reset,
  } = useForm<MovementValues>({
    resolver: zodResolver(stockMovementSchema),
    mode: "onChange",
    defaultValues: {
      eppId: undefined,
      type: "ENTRY",
      quantity: 1,
      note: "",
    },
  });

  const onSubmit = async (data: MovementValues) => {
    const fd = new FormData();
    Object.entries(data).forEach(([k, v]) => fd.append(k, String(v ?? "")));
    await createMovement(fd);
    toast.success("Movimiento registrado");
    reset();
    router.push("/stock-movements");
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="grid gap-6 max-w-lg mx-auto"
    >
      {/* EPP */}
      <div className="space-y-2">
        <Label htmlFor="eppId" className="font-medium">
          Equipo de Protección Personal
        </Label>
        <Controller
          name="eppId"
          control={control}
          render={({ field }) => (
            <ComboboxEpp
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
        {errors.eppId && (
          <p className="text-destructive text-sm">{errors.eppId.message}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="type" className="font-medium">
            Tipo de movimiento
          </Label>
          <select
            id="type"
            {...register("type")}
            className="border rounded-md h-10 px-3 w-full"
          >
            <option value="ENTRY">Entrada</option>
            <option value="EXIT">Salida</option>
            <option value="ADJUSTMENT">Ajuste</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="quantity" className="font-medium">
            Cantidad
          </Label>
          <Input
            id="quantity"
            type="number"
            min={1}
            {...register("quantity", { valueAsNumber: true })}
          />
          {errors.quantity && (
            <p className="text-destructive text-sm">
              {errors.quantity.message}
            </p>
          )}
        </div>
      </div>

      {/* Nota */}
      <div className="space-y-2">
        <Label htmlFor="note" className="font-medium">
          Nota (opcional)
        </Label>
        <Textarea id="note" rows={3} {...register("note")} />
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting || !isValid}>
        {isSubmitting ? "Guardando..." : "Guardar"}
      </Button>
    </form>
  );
}
