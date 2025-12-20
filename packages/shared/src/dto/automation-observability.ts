// Canonical, immutable observability contracts for Automation OS (DESIGN-ONLY)
// No logic, no side effects, JSON-serializable only
import { z } from "zod";

export type AutomationMetricType = "COUNTER" | "GAUGE" | "DURATION";
export const AutomationMetricTypeSchema = z.enum(["COUNTER", "GAUGE", "DURATION"]);

export type AutomationMetricScope = "tenant" | "brand" | "rule" | "action";
export const AutomationMetricScopeSchema = z.enum(["tenant", "brand", "rule", "action"]);

/**
 * Observability guarantee: metric events are append-only, timestamped entries that can be correlated to runs or explain snapshots without mutation.
 */
export interface AutomationMetricEvent {
  type: AutomationMetricType;
  scope: AutomationMetricScope;
  name: string; // e.g., "rule_evaluated", "action_duration"
  value: number;
  at: string; // ISO 8601 timestamp
  correlationId?: string; // Optional, for linking to explain snapshot or run
  snapshotId?: string; // Optional, for linking to explain snapshot
  meta?: Record<string, unknown>; // Optional, extra context
}

export const AutomationMetricEventSchema = z.object({
  type: AutomationMetricTypeSchema,
  scope: AutomationMetricScopeSchema,
  name: z.string(),
  value: z.number(),
  at: z.string(),
  correlationId: z.string().optional(),
  snapshotId: z.string().optional(),
  meta: z.record(z.unknown()).optional(),
});

export interface AutomationMetricEnvelope {
  events: AutomationMetricEvent[];
  generatedAt: string; // ISO 8601
  source: string; // e.g., "runtime", "api", "observer"
  correlationId?: string;
  snapshotId?: string;
}

export const AutomationMetricEnvelopeSchema = z.object({
  events: z.array(AutomationMetricEventSchema),
  generatedAt: z.string(),
  source: z.string(),
  correlationId: z.string().optional(),
  snapshotId: z.string().optional(),
});

export type AutomationMetricsRunStatus = "SUCCESS" | "FAILED";
export type AutomationMetricsActionStatus = AutomationMetricsRunStatus;

export interface AutomationMetricsRunPayload {
  runId: string;
  ruleVersionId?: string;
  companyId?: string;
  brandId?: string;
  startedAt?: string;
}

export interface AutomationMetricsRunStartPayload extends AutomationMetricsRunPayload {}

export interface AutomationMetricsRunEndPayload extends AutomationMetricsRunPayload {
  status: AutomationMetricsRunStatus;
  finishedAt?: string;
  durationMs?: number;
}

export interface AutomationMetricsActionPayload {
  runId: string;
  actionRunId: string;
  actionType?: string;
  startedAt?: string;
}

export interface AutomationMetricsActionStartPayload extends AutomationMetricsActionPayload {}

export interface AutomationMetricsActionEndPayload extends AutomationMetricsActionPayload {
  status: AutomationMetricsActionStatus;
  finishedAt?: string;
}

export interface AutomationMetricsSnapshot {
  runsStarted: number;
  runsSucceeded: number;
  runsFailed: number;
  actionsStarted: number;
  actionsSucceeded: number;
  actionsFailed: number;
  runDurationMs: number;
}

/**
 * Collector guarantee: `snapshot` is a read-only summary that reflects all emitted events and stays stable for the lifetime of the collector instance.
 */
export interface AutomationMetricsCollector {
  readonly snapshot: AutomationMetricsSnapshot;
  onRunStart(payload: AutomationMetricsRunStartPayload): void;
  onRunEnd(payload: AutomationMetricsRunEndPayload): void;
  onActionStart(payload: AutomationMetricsActionStartPayload): void;
  onActionEnd(payload: AutomationMetricsActionEndPayload): void;
}
