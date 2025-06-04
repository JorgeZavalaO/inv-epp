import { z } from "zod";

export const returnSchema = z.object({
  eppId:       z.coerce.number().min(1, "Selecciona un EPP"),
  warehouseId: z.coerce.number().min(1, "Selecciona un almacén"),
  employee:    z.string().min(1, "Selecciona un empleado"),
  quantity:    z.coerce.number().int().positive("Cantidad > 0"),
  condition:   z.enum(["REUSABLE", "DISCARDED"]),
  note:        z.string().max(255).optional(),
});

export type ReturnValues = z.infer<typeof returnSchema>;
