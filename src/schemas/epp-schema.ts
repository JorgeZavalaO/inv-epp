import { z } from "zod";

export const eppSchema = z.object({
  id: z
    .coerce
    .number({ invalid_type_error: "ID inválido" })
    .optional(),
  code: z.string().optional(),
  name: z.string().min(1, "El nombre es requerido"),
  category: z.string().min(1, "La categoría es requerida"),
  description: z.string().optional(),
  minStock: z
    .coerce.number({ invalid_type_error: "Stock mínimo debe ser un número" })
    .min(0, "Stock mínimo debe ser ≥ 0"),
  imageUrl: z.string().optional(),
  datasheetUrl: z.string().optional(),
  warehouseId: z
    .coerce
    .number({ invalid_type_error: "Almacén inválido" })
    .int()
    .positive()
    .optional(),
  initialQty: z
    .coerce.number({ invalid_type_error: "Cantidad inicial debe ser un número" })
    .int()
    .min(0, "Cantidad inicial debe ser ≥ 0")
    .optional(),
});
