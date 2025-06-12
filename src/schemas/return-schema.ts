import { z } from "zod";

export const returnBatchSchema = z.object({
  batchId: z.coerce
    .number({ invalid_type_error: "Selecciona un lote" })
    .int()
    .positive("Selecciona un lote"),
  items: z
    .array(
      z.object({
        eppId:       z.coerce.number().int().positive("EPP inválido"),
        warehouseId: z.coerce.number().int().positive("Almacén inválido"),
        delivered:   z.coerce.number().int().nonnegative(),
        quantity:    z.coerce
                         .number({ invalid_type_error: "Cantidad inválida" })
                         .int()
                         .min(1, "Devuelve al menos una unidad"),

        code:        z.string(),
        name:        z.string(),
      })
    )
    .min(1, "Debe seleccionar al menos un ítem"),
  note: z.string().max(255).optional(),
});

export type ReturnBatchValues = z.infer<typeof returnBatchSchema>;
