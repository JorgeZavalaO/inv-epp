import { z } from "zod";

export const deliverySchema = z.object({
  id:        z.coerce.number().optional(),
  eppId:     z.coerce.number().min(1, "Selecciona un EPP"),
  employee:  z.string().min(2, "Selecciona un usuario"),      // recibe nombre
  quantity:  z.coerce.number().int().positive("Cantidad > 0"),
  note:      z.string().max(255).optional(),
});

export type DeliveryValues = z.infer<typeof deliverySchema>;
