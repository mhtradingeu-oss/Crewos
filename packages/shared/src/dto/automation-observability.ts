// Canonical, immutable observability contracts for Automation OS (DESIGN-ONLY)
// No logic, no side effects, JSON-serializable only
import { z } from "zod";

export type AutomationMetricType = "COUNTER" | "GAUGE" | "DURATION";
export const AutomationMetricTypeSchema = z.enum(["COUNTER", "GAUGE", "DURATION"]);

export type AutomationMetricScope = "tenant" | "brand" | "rule" | "action";
export const AutomationMetricScopeSchema = z.enum(["tenant", "brand", "rule", "action"]);

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
