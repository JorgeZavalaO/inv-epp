// src/schemas/delivery-batch-schema.ts

import { z } from "zod";

export const itemSchema = z.object({
  eppId:       z.number().int().positive("Selecciona un EPP"),
  warehouseId: z.number().int().positive("Selecciona un almacén"),
  quantity:    z.number().int().positive("Cantidad > 0"),
});

export const deliveryBatchSchema = z
  .object({
    employee: z.string().min(2, "Selecciona un receptor"),
    note:     z.string().max(255).optional(),
    items:    z.array(itemSchema).min(1, "Añade al menos un ítem"),
  })
  .refine(
    (val) => {
      // Todos los warehouseId dentro de items deber ser iguales
      const ids = val.items.map((it) => it.warehouseId);
      return Array.from(new Set(ids)).length === 1;
    },
    {
      message: "Todos los ítems deben provenir del mismo almacén",
      path: ["items"],
    }
  );

export type DeliveryBatchValues = z.infer<typeof deliveryBatchSchema>;
