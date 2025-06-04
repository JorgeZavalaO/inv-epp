import { z } from "zod";

export const transferSchema = z
  .object({
    eppId:    z.number().int().positive("Selecciona un EPP"),
    fromId:   z.number().int().positive("Selecciona almacén origen"),
    toId:     z.number().int().positive("Selecciona almacén destino"),
    quantity: z.number().int().positive("Cantidad > 0"),
    note:     z.string().max(255).optional(),
  })
  .refine((data) => data.fromId !== data.toId, {
    message: "Almacén origen y destino deben ser distintos",
    path: ["toId"],
  });

export type TransferValues = z.infer<typeof transferSchema>;
