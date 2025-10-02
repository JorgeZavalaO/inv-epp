import { z } from 'zod';

export const auditLogFilterSchema = z.object({
  entityType: z.string().optional(),
  entityId: z.coerce.number().optional(),
  userId: z.coerce.number().optional(),
  action: z.enum(['CREATE', 'UPDATE', 'DELETE']).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(50),
});

export type AuditLogFilter = z.infer<typeof auditLogFilterSchema>;
