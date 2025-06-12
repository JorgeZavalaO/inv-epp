import { z } from "zod";

export const itemSchema = z.object({
  eppId:    z.coerce
               .number({ invalid_type_error: "Selecciona un EPP" })
               .int()
               .positive("Selecciona un EPP"),
  quantity: z.coerce
               .number({ invalid_type_error: "Cantidad inválida" })
               .int()
               .positive("Cantidad > 0"),
});

export const deliveryBatchSchema = z.object({
  collaboratorId: z.coerce
                     .number({ invalid_type_error: "Selecciona un colaborador" })
                     .int()
                     .positive("Selecciona un colaborador"),
  note:           z.string().max(255).optional(),
  warehouseId:    z.coerce
                     .number({ invalid_type_error: "Selecciona un almacén" })
                     .int()
                     .positive("Selecciona un almacén"),
  items:          z
                     .array(itemSchema)
                     .min(1, "Añade al menos un ítem"),
});

export type DeliveryBatchValues = z.infer<typeof deliveryBatchSchema>;
