import { z } from "zod";

export const eppSchema = z.object({
  id:          z.number().optional(),
  code:        z.string().optional(),    // si no viene, se autogenera
  name:        z.string().min(1, "El nombre es requerido"),
  category:    z.string().min(1, "La categoría es requerida"),
  description: z.string().optional(),
  minStock:    z.number({ required_error: "El stock mínimo es requerido" })
                   .min(0, "Stock mínimo debe ser ≥ 0"),
  imageUrl:    z.string().optional(),
  datasheetUrl:z.string().optional(),
});