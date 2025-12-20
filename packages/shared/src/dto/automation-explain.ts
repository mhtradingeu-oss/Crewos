// Canonical, immutable explainability contracts for Automation OS
// Pure DTOs + Zod schemas (JSON-serializable only)
// No runtime logic, no side effects
import { z } from "zod";

// Supporting types
export type ExplainMode = "PLAN_ONLY" | "DISABLED" | "ALLOWLIST_ONLY";
export const ExplainModeSchema = z.enum(["PLAN_ONLY", "DISABLED", "ALLOWLIST_ONLY"]);

export type ExplainLevel = "SUMMARY" | "RULE" | "CONDITION" | "ACTION";
export const ExplainLevelSchema = z.enum(["SUMMARY", "RULE", "CONDITION", "ACTION"]);

export type ExplainCode = string;

/** ISO 8601 timestamp string (e.g., 2025-12-17T12:34:56.789Z) */
export type ExplainTimestampISO = string;

export type AutomationExplainSnapshotStatus = "SUCCESS" | "FAILED";

export interface AutomationExplainSnapshotEvent {
  readonly name: string;
  readonly occurredAt: string;
  readonly payload: unknown;
}

export interface AutomationExplainConditionResult {
  readonly passed: boolean;
  readonly reason?: string;
}

export interface AutomationExplainAction {
  readonly index: number;
  readonly actionType: string;
  readonly status: AutomationExplainSnapshotStatus;
  readonly output?: unknown;
  readonly error?: string;
}

export interface AutomationExplainSnapshot {
  readonly runId: string;
  readonly companyId: string;
  readonly brandId?: string;
  readonly ruleVersionId: string;
  readonly event: AutomationExplainSnapshotEvent;
  readonly conditions: AutomationExplainConditionResult;
  readonly actions: readonly AutomationExplainAction[];
  readonly finalStatus: AutomationExplainSnapshotStatus;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly error?: string;
}

// Core DTOs
export interface AutomationDecisionSummary {
  allowed: boolean;
  mode: ExplainMode;
  reasonCodes: string[];
  message?: string;
}

export const AutomationDecisionSummarySchema = z.object({
  allowed: z.boolean(),
  mode: ExplainModeSchema,
  reasonCodes: z.array(z.string()),
  message: z.string().optional(),
});


export interface ConditionExplainEntry {
  kind: "json-logic";
  passed: boolean;
  reason?: string;
  details?: Record<string, unknown>;
  level?: ExplainLevel;
}

export const ConditionExplainEntrySchema = z.object({
  kind: z.literal("json-logic"),
  passed: z.boolean(),
  reason: z.string().optional(),
  details: z.record(z.unknown()).optional(),
  level: ExplainLevelSchema.optional(),
});

export interface PolicyExplainEntry {
  allowed: boolean;
  mode: ExplainMode;
  reasons: Array<{ code: string; message: string }>;
  scope?: { tenantId?: string; brandId?: string };
}

export const PolicyExplainEntrySchema = z.object({
  allowed: z.boolean(),
  mode: ExplainModeSchema,
  reasons: z.array(z.object({ code: z.string(), message: z.string() })),
  scope: z
    .object({ tenantId: z.string().optional(), brandId: z.string().optional() })
    .optional(),
});


export interface ActionExplainEntry {
  type: string;
  mode: "PLAN_ONLY";
  planned: boolean;
  reason?: string;
  params?: Record<string, unknown>;
  level?: ExplainLevel;
}

export const ActionExplainEntrySchema = z.object({
  type: z.string(),
  mode: z.literal("PLAN_ONLY"),
  planned: z.boolean(),
  reason: z.string().optional(),
  params: z.record(z.unknown()).optional(),
  level: ExplainLevelSchema.optional(),
});

export interface RuleExplainEntry {
  ruleId: string;
  versionId: string;
  ruleName?: string;
  priority?: number;
  conditions: ConditionExplainEntry[];
  conditionPassed: boolean;
  policy?: PolicyExplainEntry;
  actions: ActionExplainEntry[];
  decision: AutomationDecisionSummary;
}

export const RuleExplainEntrySchema = z.object({
  ruleId: z.string(),
  versionId: z.string(),
  ruleName: z.string().optional(),
  priority: z.number().optional(),
  conditions: z.array(ConditionExplainEntrySchema),
  conditionPassed: z.boolean(),
  policy: PolicyExplainEntrySchema.optional(),
  actions: z.array(ActionExplainEntrySchema),
  decision: AutomationDecisionSummarySchema,
});

export interface AutomationExplainTrace {
  traceId: string;
  occurredAt: ExplainTimestampISO;
  tenantId: string;
  brandId?: string;
  eventName: string;
  matchedRules: RuleExplainEntry[];
  finalDecision: AutomationDecisionSummary;
  level: ExplainLevel;
}

export const AutomationExplainTraceSchema = z.object({
  traceId: z.string(),
  occurredAt: z.string(), // ISO
  tenantId: z.string(),
  brandId: z.string().optional(),
  eventName: z.string(),
  matchedRules: z.array(RuleExplainEntrySchema),
  finalDecision: AutomationDecisionSummarySchema,
  level: ExplainLevelSchema,
});
