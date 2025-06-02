import { z } from "zod";

export const itemSchema = z.object({
  eppId:    z.number().int().positive(),
  quantity: z.number().int().positive(),
});

export const deliveryBatchSchema = z.object({
  employee: z.string().min(2, "Selecciona un receptor"),
  note:     z.string().max(255).optional(),
  items:    z.array(itemSchema).min(1, "Añade al menos un EPP"),
});

export type DeliveryBatchValues = z.infer<typeof deliveryBatchSchema>;
