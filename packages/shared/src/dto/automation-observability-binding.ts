// Canonical, immutable binding contracts for Snapshot → Metrics (DESIGN-ONLY)
// No logic, no side effects, JSON-serializable only

import { z } from "zod";
import type { AutomationMetricProjectionSpec } from "./automation-observability-projection.js";
import { AutomationMetricProjectionSpecSchema } from "./automation-observability-projection.js";

// Supporting types
export type MetricKey = string;

export interface SnapshotRef {
  snapshotId: string;
  correlationId?: string;
  tenantId?: string;
  brandId?: string;
}

export const SnapshotRefSchema = z.object({
  snapshotId: z.string(),
  correlationId: z.string().optional(),
  tenantId: z.string().optional(),
  brandId: z.string().optional(),
});

export type BindingMode = "DESIGN_ONLY" | "FUTURE_EXECUTION";
export const BindingModeSchema = z.enum(["DESIGN_ONLY", "FUTURE_EXECUTION"]);

export interface AutomationMetricDerivationRule {
  metricKey: MetricKey;
  source: "SNAPSHOT";
  snapshotPath: string; // dot-path, e.g. "payload.trace.finalDecision.allowed"
  op: "COUNT" | "DURATION_MS" | "BOOLEAN" | "STRING" | "NUMBER";
  notes?: string;
}

export const AutomationMetricDerivationRuleSchema = z.object({
  metricKey: z.string(),
  source: z.literal("SNAPSHOT"),
  snapshotPath: z.string().min(1),
  op: z.enum(["COUNT", "DURATION_MS", "BOOLEAN", "STRING", "NUMBER"]),
  notes: z.string().optional(),
});

export interface AutomationSnapshotMetricBinding {
  bindingId: string;
  mode: BindingMode;
  snapshotRef: SnapshotRef;
  rules: AutomationMetricDerivationRule[];
  projection: AutomationMetricProjectionSpec[];
  createdAt: string;
  version: number;
}

export const AutomationSnapshotMetricBindingSchema = z.object({
  bindingId: z.string(),
  mode: BindingModeSchema,
  snapshotRef: SnapshotRefSchema,
  rules: z.array(AutomationMetricDerivationRuleSchema),
  projection: z.array(AutomationMetricProjectionSpecSchema),
  createdAt: z.string(),
  version: z.number().int(),
});

export interface AutomationObservabilityBindingConfig {
  enabled: boolean;
  mode: BindingMode;
  defaultRules: AutomationMetricDerivationRule[];
  defaultProjection: AutomationMetricProjectionSpec[];
}

export const AutomationObservabilityBindingConfigSchema = z.object({
  enabled: z.boolean(),
  mode: BindingModeSchema,
  defaultRules: z.array(AutomationMetricDerivationRuleSchema),
  defaultProjection: z.array(AutomationMetricProjectionSpecSchema),
});

export interface AutomationObservabilityBindingInput {
  snapshotRef: SnapshotRef;
  config: AutomationObservabilityBindingConfig;
}

export const AutomationObservabilityBindingInputSchema = z.object({
  snapshotRef: SnapshotRefSchema,
  config: AutomationObservabilityBindingConfigSchema,
});

export interface AutomationObservabilityBindingOutput {
  binding: AutomationSnapshotMetricBinding;
  warnings: Array<{ code: string; message: string }>;
}

export const AutomationObservabilityBindingOutputSchema = z.object({
  binding: AutomationSnapshotMetricBindingSchema,
  warnings: z.array(z.object({ code: z.string(), message: z.string() })),
});
