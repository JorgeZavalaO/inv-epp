import { z } from "zod";

const urlOrEmpty = z.preprocess(
  v => (v === "" ? undefined : v),
  z.string().url().optional()
);

const int = () => z.preprocess(v => Number(v), z.number().int().min(0));
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
  stock:       int(),
  minStock:    int(),
  imageUrl:    urlOrEmpty,
  datasheetUrl:urlOrEmpty,
});

export type EppFormValues = z.infer<typeof eppSchema>;
