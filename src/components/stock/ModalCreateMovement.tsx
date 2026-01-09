"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { stockMovementSchema, MovementValues } from "@/schemas/stock-movement-schema";
import { createMovement } from "@/app/(protected)/stock-movements/actions";
import ComboboxEpp from "@/components/ui/ComboboxEpp";
import ComboboxWarehouse from "@/components/ui/ComboboxWarehouse";

type Props = {
  onClose: () => void;
  defaultValues?: Partial<MovementValues>;
};

export default function ModalCreateMovement({ onClose, defaultValues }: Props) {
  const router = useRouter();
  const [warehouses, setWarehouses] = React.useState<{ id: number; label: string }[]>([]);
  const [currentStock, setCurrentStock] = React.useState<number | null>(null);

  const {
    control,
    register,
    handleSubmit,
    watch,
    formState: { isSubmitting, errors, isValid },
  } = useForm<MovementValues>({
    resolver: zodResolver(stockMovementSchema),
    mode: "onChange",
    defaultValues: {
      eppId:       defaultValues?.eppId ?? undefined,
      warehouseId: defaultValues?.warehouseId ?? undefined,
      type:        "ENTRY",
      quantity:    1,
      note:        "",
    },
  });

  // Al cargar el modal, traigo lista de almacenes
  React.useEffect(() => {
    fetch("/api/warehouses")
      .then((res) => res.json())
      .then((list: Array<{ id: number; name: string }>) => {
        setWarehouses(list.map((w) => ({ id: w.id, label: w.name })));
      })
      .catch(() => {
        setWarehouses([]);
      });
  }, []);

  // Cuando cambia eppId, recargo stock actual (suma de todos los almacenes:
  // suponemos que en API /api/epps/[id] viene el “stock” global)
  const selectedEppId = watch("eppId");
  React.useEffect(() => {
    if (!selectedEppId) {
      setCurrentStock(null);
      return;
    }
    fetch(`/api/epps/${selectedEppId}`)
      .then((res) => res.json())
      .then((data: { stocks?: Array<{ quantity: number }> }) => {
        // si la ruta devuelve campo 'stocks' (array), sumamos; si no, se ignora:
        if (Array.isArray(data.stocks)) {
          const total = data.stocks.reduce((acc, s) => acc + (s.quantity || 0), 0);
          setCurrentStock(total);
        } else {
          setCurrentStock(null);
        }
      })
      .catch(() => setCurrentStock(null));
  }, [selectedEppId]);

  const onSubmit = async (data: MovementValues) => {
    const fd = new FormData();
    Object.entries(data).forEach(([k, v]) => fd.append(k, String(v ?? "")));

    try {
      const result = await createMovement(fd);
      
      // Verificar si el resultado indica que requiere aprobación
      if (result && 'requiresApproval' in result && result.requiresApproval) {
        toast.warning(result.message || "Movimiento creado. Pendiente de aprobación.", {
          duration: 5000,
        });
      } else {
        toast.success(result?.message || "Movimiento registrado exitosamente");
      }
      
      onClose();
      router.replace("/stock-movements");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al registrar";
      toast.error(msg);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b pb-4">
          <div>
            <DialogTitle className="text-2xl font-bold">Nuevo Movimiento</DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">Registra una entrada, salida o ajuste de inventario</p>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* SECCIÓN 1: PRODUCTO Y ALMACÉN */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 text-slate-900 text-xs font-bold">1</span>
              Producto y ubicación
            </h3>

            {/* EPP */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Equipo de Protección Personal</Label>
              <Controller
                name="eppId"
                control={control}
                render={({ field }) => <ComboboxEpp value={field.value} onChange={field.onChange} />}
              />
              {selectedEppId && currentStock !== null && (
                <div className={`p-2.5 rounded-lg border text-sm font-medium flex items-center gap-2 ${
                  currentStock > 0
                    ? "bg-green-50 border-green-200 text-green-700"
                    : "bg-red-50 border-red-200 text-red-700"
                }`}>
                  <span className={currentStock > 0 ? "text-green-600" : "text-red-600"}>📊</span>
                  Stock total: <span className="font-bold">{currentStock} unidades</span>
                </div>
              )}
              {errors.eppId && <p className="text-destructive text-sm flex items-center gap-1">⚠️ {errors.eppId.message}</p>}
            </div>

            {/* Almacén */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Almacén</Label>
              <Controller
                name="warehouseId"
                control={control}
                render={({ field }) => (
                  <ComboboxWarehouse
                    value={field.value ?? null}
                    onChange={field.onChange}
                    options={warehouses}
                  />
                )}
              />
              {errors.warehouseId && (
                <p className="text-destructive text-sm flex items-center gap-1">⚠️ {errors.warehouseId.message}</p>
              )}
            </div>
          </div>

          {/* Tipo y Cantidad */}
          <div className="border-t pt-4 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 text-slate-900 text-xs font-bold">2</span>
              Detalles del movimiento
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Tipo de movimiento</Label>
                <select
                  {...register("type")}
                  className="block w-full rounded border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                >
                  <option value="ENTRY">📥 Entrada</option>
                  <option value="EXIT">📤 Salida</option>
                  <option value="ADJUSTMENT">🔧 Ajuste</option>
                </select>
                <p className="text-xs text-muted-foreground">Tipo de operación a realizar</p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Cantidad</Label>
                <Input
                  type="number"
                  step={1}
                  min={1}
                  {...register("quantity", { valueAsNumber: true })}
                  className="focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
                {errors.quantity && (
                  <p className="text-destructive text-sm flex items-center gap-1">⚠️ {errors.quantity.message}</p>
                )}
                <p className="text-xs text-muted-foreground">Unidades a mover</p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Precio unitario</Label>
                <Input
                  type="number"
                  step={0.01}
                  min={0}
                  placeholder="0.00"
                  {...register("unitPrice", { valueAsNumber: true })}
                  className="focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                />
                {errors.unitPrice && (
                  <p className="text-destructive text-sm flex items-center gap-1">⚠️ {errors.unitPrice.message}</p>
                )}
                <p className="text-xs text-muted-foreground">Precio por unidad</p>
              </div>
            </div>
          </div>

          {/* Nota */}
          <div className="border-t pt-4 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 text-slate-900 text-xs font-bold">3</span>
              Información adicional (opcional)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Orden de Compra</Label>
                <Input 
                  {...register("purchaseOrder")} 
                  placeholder="Ej: OC-2026-001"
                  className="focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                />
                <p className="text-xs text-muted-foreground">Para trazabilidad de compras</p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Nota</Label>
                <Input 
                  {...register("note")} 
                  placeholder="Ej: Compra urgente, revisión especial..."
                  className="focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
                <p className="text-xs text-muted-foreground">Información relevante sobre el movimiento</p>
              </div>
            </div>
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-6 border-t">
            <Button 
              variant="outline" 
              type="button" 
              onClick={onClose} 
              disabled={isSubmitting}
              className="px-6"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={!isValid || isSubmitting}
              className="px-8 bg-blue-600 hover:bg-blue-700 flex items-center"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? "Guardando..." : "Guardar movimiento"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
