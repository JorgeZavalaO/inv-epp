import { z } from "zod";

export const itemSchema = z.object({
  eppId:       z.number().int().positive("Selecciona un EPP"),
  warehouseId: z.number().int().positive("Selecciona un almacén"),
  quantity:    z.number().int().positive("Cantidad > 0"),
});

export const deliveryBatchSchema = z
  .object({
    collaboratorId: z.number().int().positive("Selecciona un colaborador"),
    note:           z.string().max(255).optional(),
    warehouseId:    z.number().int().positive("Selecciona un almacén"),
    items:          z.array(itemSchema).min(1, "Añade al menos un ítem"),
  })
  .refine((val) => val.items.every((it) => it.warehouseId === val.warehouseId), {
    message: "Todos los ítems deben provenir del mismo almacén",
    path: ["items"],
  });

export type DeliveryBatchValues = z.infer<typeof deliveryBatchSchema>;