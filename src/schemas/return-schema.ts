import { z } from "zod";

export const returnSchema = z.object({
  id:        z.coerce.number().optional(),
  eppId:     z.coerce.number().min(1, "Selecciona un EPP"),
  employee:  z.string().min(2, "Nombre es requerido"),
  quantity:  z.coerce.number().int().positive("Cantidad > 0"),
  condition: z.enum(["REUSABLE", "DISCARDED"]),
  note:      z.string().max(255).optional(),
});

export type ReturnValues = z.infer<typeof returnSchema>;
