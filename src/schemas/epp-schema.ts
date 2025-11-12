import { z } from "zod";

export const stockItemSchema = z.object({
  warehouseId: z
    .coerce
    .number({ invalid_type_error: "Almacén inválido" })
    .int()
    .positive("Selecciona un almacén"),
  initialQty: z
    .coerce
    .number({ invalid_type_error: "Cantidad inválida" })
    .int()
    .min(0, "Cantidad ≥ 0"),
});

export type StockItemValues = z.infer<typeof stockItemSchema>;

export const eppSchema = z
  .object({
    id:          z.coerce.number().int().positive().optional(),
    code:        z.string().optional(),
    name:        z.string().min(1, "El nombre es requerido"),
    category:    z.string().min(1, "La categoría es requerida"),
    subcategory: z.string().optional(),
    description: z.string().optional(),
    minStock:    z
      .coerce.number({ invalid_type_error: "Stock mínimo debe ser un número" })
      .min(0, "Stock mínimo debe ser ≥ 0"),
    imageUrl:    z.string().optional(),
    datasheetUrl:z.string().optional(),
    // Ahora permitimos múltiples stocks iniciales
    items:       z
      .array(stockItemSchema)
      .min(1, "Agrega al menos un stock inicial"),
  });

export type EppValues = z.infer<typeof eppSchema>;
