import { z } from "zod";

const conditionSchema = z.object({
  path: z.string(),
  op: z.enum(["eq", "neq", "gt", "lt", "includes"]),
  value: z.any(),
});

const actionSchema = z.object({
  type: z.string(),
  params: z.record(z.string(), z.any()).optional(),
});

export const createAutomationSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  brandId: z.string().optional(),
  triggerType: z.enum(["event", "schedule"]),
  triggerEvent: z.string().optional(),
  triggerConfig: z.record(z.string(), z.any()).optional(),
  conditionConfig: z
    .object({
      all: z.array(conditionSchema).optional(),
      any: z.array(conditionSchema).optional(),
    })
    .optional(),
  actions: z.array(actionSchema).min(1),
  isActive: z.boolean().optional(),
});

export const updateAutomationSchema = createAutomationSchema.partial();
