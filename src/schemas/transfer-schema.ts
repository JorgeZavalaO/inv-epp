import { z } from "zod";

export const transferItemSchema = z.object({
  eppId: z.coerce.number().int().positive("Selecciona un EPP"),
  quantity: z.coerce.number().int().positive("Cantidad > 0"),
});

export const transferSchema = z
  .object({
    eppId:    z.coerce.number().int().positive("Selecciona un EPP"),
    fromId:   z.coerce.number().int().positive("Selecciona almacén origen"),
    toId:     z.coerce.number().int().positive("Selecciona almacén destino"),
    quantity: z.coerce.number().int().positive("Cantidad > 0"),
    note:     z.string().max(255).optional(),
  })
  .refine((data) => data.fromId !== data.toId, {
    message: "Almacén origen y destino deben ser distintos",
    path: ["toId"],
  });

export const transferBatchSchema = z
  .object({
    fromId: z.coerce.number().int().positive("Selecciona almacén origen"),
    toId: z.coerce.number().int().positive("Selecciona almacén destino"),
    note: z.string().max(255).optional(),
    items: z.array(transferItemSchema).min(1, "Agrega al menos un producto"),
  })
  .refine((data) => data.fromId !== data.toId, {
    message: "Almacén origen y destino deben ser distintos",
    path: ["toId"],
  })
  .refine((data) => new Set(data.items.map((i) => i.eppId)).size === data.items.length, {
    message: "No repitas el mismo EPP en el traslado",
    path: ["items"],
  });

export type TransferValues = z.infer<typeof transferSchema>;
export type TransferBatchValues = z.infer<typeof transferBatchSchema>;
