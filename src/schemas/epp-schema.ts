import { z } from "zod";

const urlOrEmpty = z.preprocess(
  v => (v === "" ? undefined : v),
  z.string().url().optional()
);

/**
 *  - id            → autoincrement / editar
 *  - stock         → cantidad real en almacén
 *  - minStock      → umbral de alerta
 */
export const eppSchema = z.object({
  id:          z.coerce.number().optional(),
  code:        z.string().min(2, "Requerido"),
  name:        z.string().min(2, "Requerido"),
  category:    z.string().min(2, "Requerido"),
  description: z.string().optional(),
  stock:       z.coerce.number().min(0).default(0),
  minStock:    z.coerce.number().min(0).default(0),
  imageUrl:    urlOrEmpty,
  datasheetUrl:urlOrEmpty,
});

export type EppFormValues = z.infer<typeof eppSchema>;
