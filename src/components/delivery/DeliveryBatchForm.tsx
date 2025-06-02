"use client";
import * as React from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Trash } from "lucide-react";
import { deliveryBatchSchema, DeliveryBatchValues } from "@/schemas/delivery-batch-schema";
import { createDeliveryBatch } from "@/app/(protected)/deliveries/actions";
import ComboboxEpp  from "@/components/ui/ComboboxEpp";
import ComboboxUser from "@/components/ui/ComboboxUser";
import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { Label }    from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge }    from "@/components/ui/badge";
import { toast }    from "sonner";
import { useRouter } from "next/navigation";

export default function DeliveryBatchForm({ users }:{ users:{id:number;label:string;email:string}[] }) {
  const router = useRouter();

const { control, handleSubmit, formState:{isSubmitting,isValid,errors}, watch } =
  useForm<DeliveryBatchValues>({
    resolver: zodResolver(deliveryBatchSchema),
    defaultValues:{ employee:"", note:"", items:[{ eppId: undefined, quantity:1 }] },
  });

  const { fields, append, remove } = useFieldArray({ control, name:"items" });

  // Fetch stock when epp changes
  const [stockMap,setStockMap] = React.useState<Record<number,number>>({});
  const items = watch("items");

React.useEffect(()=>{
  items.forEach(async (it)=>{
    if (it.eppId && stockMap[it.eppId] === undefined){
      try{
        const r = await fetch(`/api/epps/${it.eppId}`, { cache:"no-store" });  /* ❷ */
        if (!r.ok) throw new Error();
        const { stock } = await r.json();
        setStockMap(m=>({...m,[it.eppId]:stock}));
      }catch{}
    }
  });
},[items,stockMap]);

  const onSubmit = async (values:DeliveryBatchValues)=>{
    const fd = new FormData();
    fd.append("payload",JSON.stringify(values));
    try{
      await createDeliveryBatch(fd);
      toast.success("Entrega registrada");
      router.push("/deliveries");
    }catch(e: unknown){
      if (e instanceof Error) {
        toast.error(e.message ?? "Error");
      } else {
        toast.error("Error");
      }
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6 max-w-3xl">
      {/* Receptor */}
      <Controller name="employee" control={control} render={({field})=>(
        <div className="space-y-1">
          <Label>Empleado receptor</Label>
          <ComboboxUser
            value={users.find(u=>u.label===field.value)?.id??null}
            onChange={(id)=>field.onChange(users.find(u=>u.id===id)?.label??"")}
            options={users}
          />
          {errors.employee && <p className="text-destructive text-sm">{errors.employee.message}</p>}
        </div>
      )}/>

      {/* ITEMS */}
      <div className="space-y-4">
        {fields.map((f,idx)=>(
          <div key={f.id} className="grid grid-cols-12 gap-2 items-end">
            <Controller name={`items.${idx}.eppId`} control={control} render={({field})=>(
              <div className="col-span-6">
                <Label>EPP</Label>
                <ComboboxEpp value={field.value} onChange={field.onChange}/>
              </div>
            )}/>
            <div className="col-span-3">
              <Label>Cantidad</Label>
              <Controller
                name={`items.${idx}.quantity`}
                control={control}
                render={({field})=>(
                  <Input
                    type="number"
                    min={1}
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                )}
              />
            </div>
            <div className="col-span-2">
              <Label>Stock</Label>
              {items[idx].eppId ? (
                <Badge variant={ (stockMap[items[idx].eppId] ?? 0) === 0 ? "destructive":"secondary"}>
                  {stockMap[items[idx].eppId] ?? "…"}
                </Badge>
              ) : <span>-</span>}
            </div>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={()=>remove(idx)}
              className="col-span-1 mb-1"
              aria-label="Eliminar renglón"
            >
              <Trash size={16}/>
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" onClick={()=>append({eppId: null as unknown as number, quantity: 1})}>
          <Plus size={16} className="mr-1"/> Añadir EPP
        </Button>
      </div>

      {/* Nota */}
      <div>
        <Label>Nota (opcional)</Label>
        <Textarea {...control.register("note")} rows={3}/>
      </div>

      {/* Acciones */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" type="button" onClick={()=>router.back()}>Cancelar</Button>
        <Button disabled={!isValid||isSubmitting} type="submit">
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
          Guardar
        </Button>
      </div>
    </form>
  );
}
