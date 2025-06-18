import { z } from "zod";

export const collaboratorCsvRowSchema = z.object({
  name:     z.string().min(2, "Nombre requerido"),
  email:    z.string().email().optional().or(z.literal("")),
  position: z.string().max(64).optional().or(z.literal("")),
  location: z.string().max(64).optional().or(z.literal("")),
});
export type CollaboratorCsvRow = z.infer<typeof collaboratorCsvRowSchema>;
