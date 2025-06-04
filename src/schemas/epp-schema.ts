import { z } from "zod";

export const eppSchema = z.object({
  id:          z.number().optional(),
  code:        z.string().optional(),
  name:        z.string().min(1, "El nombre es requerido"),
  category:    z.string().min(1, "La categoría es requerida"),
  description: z.string().optional(),
  minStock:    z
    .coerce.number({ invalid_type_error: "El stock mínimo debe ser un número" })
    .min(0, "Stock mínimo debe ser ≥ 0"),
  imageUrl:    z.string().optional(),
  datasheetUrl:z.string().optional(),
});