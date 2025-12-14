

import { z } from "zod";
import {
  AutomationRuleBaseSchema,
  AutomationRuleVersionSchema,
  AutomationRunSchema,
  AutomationActionRunSchema,
} from '@mh-os/shared/src/dto/automation';

const conditionSchema = z.object({
  path: z.string(),
  op: z.enum(["eq", "neq", "gt", "lt", "includes"]),
  value: z.any(),
});

const actionSchema = z.object({
  type: z.string(),
  params: z.record(z.string(), z.any()).optional(),
});

export const createAutomationRuleSchema = AutomationRuleBaseSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastRunAt: true,
  lastRunStatus: true,
  state: true,
});

export const createAutomationRuleVersionSchema = AutomationRuleVersionSchema.omit({
  id: true,
  createdAt: true,
  state: true,
  versionNumber: true,
});

export const createAutomationRunSchema = AutomationRunSchema.omit({
  // Export for controller/routes compatibility (after declarations)
  export const createAutomationSchema = createAutomationRuleSchema;
  export const updateAutomationSchema = createAutomationRuleVersionSchema;
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true,
});

export const createAutomationActionRunSchema = AutomationActionRunSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true,
});
