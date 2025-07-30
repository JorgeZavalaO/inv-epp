import { z } from "zod";

export const systemConfigSchema = z.object({
    id:          z.coerce.number().int().positive().optional(),
    companyName: z.string().max(100, "Nombre muy largo").optional().or(z.literal("")),
    logo:     z
        .instanceof(File)
        .refine(f => f.size === 0 || f.size <=1024 * 1024, { message: "El archivo debe ser menor a 1MB" }).optional(),
});

export type SystemConfigInput = z.infer<typeof systemConfigSchema>;
