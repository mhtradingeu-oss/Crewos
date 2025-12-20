// DTO for explainability endpoint request (Phase C.5 Step 1)
// Strict, JSON-serializable, NodeNext safe
import { z } from "zod";

export const AutomationExplainRequestSchema = z.object({
  tenantId: z.string(),
  brandId: z.string().optional(),
  eventName: z.string(),
  occurredAt: z.string().optional(),
  payload: z.unknown(),
  meta: z.record(z.unknown()).optional(),
  audience: z.string().optional(),
  format: z.string().optional(),
  correlationId: z.string().optional(),
});

export type AutomationExplainRequest = z.infer<typeof AutomationExplainRequestSchema>;
