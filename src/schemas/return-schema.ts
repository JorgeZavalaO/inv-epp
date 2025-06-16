import { z } from "zod";

// Un ítem individual de devolución
const returnItemSchema = z
  .object({
    eppId:       z.coerce.number().int().positive(),
    warehouseId: z.coerce.number().int().positive(),
    delivered:   z.coerce.number().int().nonnegative(),
    quantity:    z.coerce.number().int().min(0, "Cantidad ≥ 0"),
    code:        z.string(),
    name:        z.string(),
  })
  .superRefine((it, ctx) => {
    if (it.quantity > it.delivered) {
      ctx.addIssue({
        code: z.ZodIssueCode.too_big,
        maximum: it.delivered,
        inclusive: true,
        type: "number",
        message: "No puedes devolver más de lo entregado",
        path: ["quantity"],
      });
    }
  });

// El batch completo
export const returnBatchSchema = z.object({
  warehouseId: z.coerce.number().int().positive("Selecciona un almacén"),
  batchId:     z.coerce.number().int().positive("Selecciona un lote"),
  condition: z.enum(["REUSABLE", "DISCARDED"], {
    required_error: "Selecciona la condición",
  }),
  note:        z.string().max(255).optional(),
  items:       z
    .array(returnItemSchema)
    .min(1, "Añade al menos un ítem")
    .refine((arr) => arr.some((i) => i.quantity > 0), {
      message: "Debes devolver al menos una unidad",
    }),
});

export type ReturnBatchValues = z.infer<typeof returnBatchSchema>;
