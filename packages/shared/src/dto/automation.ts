// --- Structured error/violation schemas for governance gates ---
export const PolicyViolationSchema = z.object({
  code: z.string(),
  message: z.string(),
  path: z.string().optional(),
  details: z.any().optional(),
});

export const AutomationGateErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.array(PolicyViolationSchema).optional(),
});
import { z } from 'zod';

export const AutomationRuleLifecycleState = z.enum([
  'DRAFT',
  'REVIEW',
  'ACTIVE',
  'PAUSED',
  'ARCHIVED',
]);

export const AutomationRuleBaseSchema = z.object({
  id: z.string().cuid().optional(),
  brandId: z.string().optional().nullable(),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  state: AutomationRuleLifecycleState.optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
  createdById: z.string().optional().nullable(),
  updatedById: z.string().optional().nullable(),
  lastRunAt: z.string().datetime().optional().nullable(),
  lastRunStatus: z.string().optional().nullable(),
});

export const AutomationRuleVersionSchema = z.object({
  id: z.string().cuid().optional(),
  ruleId: z.string().cuid(),
  versionNumber: z.number().int().min(1),
  triggerEvent: z.string(),
  conditionConfigJson: z.any(),
  actionsConfigJson: z.any(),
  metaSnapshotJson: z.any().optional(),
  createdAt: z.string().datetime().optional(),
  createdById: z.string().optional().nullable(),
  state: AutomationRuleLifecycleState.optional(),
});

export const AutomationRunStatus = z.enum([
  'PENDING',
  'RUNNING',
  'SUCCESS',
  'FAILED',
  'PARTIAL',
  'SKIPPED',
]);

export const AutomationRunSchema = z.object({
  id: z.string().cuid().optional(),
  ruleId: z.string().cuid(),
  ruleVersionId: z.string().cuid(),
  eventName: z.string(),
  eventId: z.string().optional().nullable(),
  status: AutomationRunStatus.optional(),
  startedAt: z.string().datetime().optional().nullable(),
  finishedAt: z.string().datetime().optional().nullable(),
  summaryJson: z.any().optional(),
  errorJson: z.any().optional(),
  triggerEventJson: z.any().optional(),
  conditionsJson: z.any().optional(),
  actionsJson: z.any().optional(),
  ruleMetaJson: z.any().optional(),
  dedupKey: z.string().optional().nullable(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export const AutomationActionRunStatus = z.enum([
  'PENDING',
  'RUNNING',
  'SUCCESS',
  'FAILED',
  'SKIPPED',
  'RETRYING',
]);

export const AutomationActionRunSchema = z.object({
  id: z.string().cuid().optional(),
  runId: z.string().cuid(),
  actionIndex: z.number().int(),
  actionType: z.string(),
  status: AutomationActionRunStatus.optional(),
  attemptCount: z.number().int().optional(),
  nextAttemptAt: z.string().datetime().optional().nullable(),
  dedupKey: z.string().optional(),
  actionConfigJson: z.any(),
  resultJson: z.any().optional(),
  errorJson: z.any().optional(),
  startedAt: z.string().datetime().optional().nullable(),
  finishedAt: z.string().datetime().optional().nullable(),
  summary: z.string().optional().nullable(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export type AutomationRule = z.infer<typeof AutomationRuleBaseSchema>;
export type AutomationRuleVersion = z.infer<typeof AutomationRuleVersionSchema>;
export type AutomationRun = z.infer<typeof AutomationRunSchema>;
export type AutomationActionRun = z.infer<typeof AutomationActionRunSchema>;
