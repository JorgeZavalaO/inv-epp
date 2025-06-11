import { z } from "zod";

export const itemSchema = z.object({
  eppId:    z.number().int().positive("Selecciona un EPP"),
  quantity: z.number().int().positive("Cantidad > 0"),
});

export const deliveryBatchSchema = z.object({
  collaboratorId: z.number().int().positive("Selecciona un colaborador"),
  note:           z.string().max(255).optional(),
  warehouseId:    z.number().int().positive("Selecciona un almacén"),
  items:          z.array(itemSchema).min(1, "Añade al menos un ítem"),
});

export type DeliveryBatchValues = z.infer<typeof deliveryBatchSchema>;
