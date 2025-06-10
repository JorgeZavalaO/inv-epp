import { z } from "zod";

export const collaboratorSchema = z.object({
  id:       z.coerce.number().int().positive().optional(),
  name:     z.string().min(2, "El nombre es requerido"),
  email:    z.string().email("Email inválido").optional(),
  position: z.string().max(64, "Posición muy larga").optional(),
  location: z.string().max(64, "Ubicación muy larga").optional(),
});

export type CollaboratorValues = z.infer<typeof collaboratorSchema>;