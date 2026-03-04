import { z } from "zod";

export const stockMovementSchema = z.object({
  id:          z.coerce.number().optional(),
  eppId:       z.coerce.number().min(1, "Selecciona un EPP"),
  warehouseId: z.coerce.number().min(1, "Selecciona un almacén"),
  type:        z.enum(["ENTRY", "EXIT", "ADJUSTMENT", "TRANSFER_IN", "TRANSFER_OUT"]),
  quantity: z.coerce
              .number({ invalid_type_error: "Cantidad inválida" })
              .int()
              .min(0, "Cantidad ≥ 0"),
  unitPrice: z.preprocess(
    (v) => (v === '' || v === null || v === undefined || (typeof v === 'number' && isNaN(v as number))) ? undefined : v, z.coerce.number({ invalid_type_error: "Precio inválido" }).min(0, "Precio ≥ 0").optional()),
  note:        z.string().max(255).optional(),
  purchaseOrder: z.string().max(100).optional(),
});

export type MovementValues = z.infer<typeof stockMovementSchema>;
