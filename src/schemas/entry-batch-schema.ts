import { z } from "zod";

export const entryItemSchema = z.object({
  eppId:    z.coerce.number().min(1, "EPP requerido"),
  quantity: z.coerce.number().int().min(1, "Cantidad ≥1"),
  unitPrice: z.coerce
            .number({ invalid_type_error: "Precio inválido" })
            .min(0, "Precio ≥ 0")
            .optional(),
});

export const entryBatchSchema = z.object({
  warehouseId: z.coerce.number().min(1, "Selecciona almacén"),
  note:        z.string().max(255).optional(),
  purchaseOrder: z.string().max(100).optional(),
  items:       z.array(entryItemSchema)
                 .min(1, "Añade al menos un producto")
                 .refine(
                   (arr) => new Set(arr.map((i) => i.eppId)).size === arr.length,
                   "No repitas el mismo EPP en el lote"
                 ),
});

export type EntryBatchValues = z.infer<typeof entryBatchSchema>;
