// Canonical, immutable collection model for Automation Observability (DESIGN-ONLY)
// No logic, no side effects, JSON-serializable only
import { z } from "zod";
import type { AutomationMetricType, AutomationMetricScope } from "./automation-observability.js";
import { AutomationMetricTypeSchema, AutomationMetricScopeSchema } from "./automation-observability.js";

export type AutomationMetricSource =
  | "PLANNER"
  | "RUNTIME"
  | "POLICY"
  | "GATE"
  | "AUDIT"
  | "EXPLAIN";

export const AutomationMetricSourceSchema = z.enum([
  "PLANNER",
  "RUNTIME",
  "POLICY",
  "GATE",
  "AUDIT",
  "EXPLAIN",
]);

export type AutomationMetricTrigger =
  | "ON_PLAN_CREATED"
  | "ON_RULE_EVALUATED"
  | "ON_POLICY_DECISION"
  | "ON_RUNTIME_COMPLETED"
  | "ON_EXPLAIN_GENERATED";

export const AutomationMetricTriggerSchema = z.enum([
  "ON_PLAN_CREATED",
  "ON_RULE_EVALUATED",
  "ON_POLICY_DECISION",
  "ON_RUNTIME_COMPLETED",
  "ON_EXPLAIN_GENERATED",
]);

export interface AutomationMetricCollectionRule {
  metricType: AutomationMetricType;
  source: AutomationMetricSource;
  trigger: AutomationMetricTrigger;
  scope: AutomationMetricScope;
  enabled: boolean;
}

export const AutomationMetricCollectionRuleSchema = z.object({
  metricType: AutomationMetricTypeSchema,
  source: AutomationMetricSourceSchema,
  trigger: AutomationMetricTriggerSchema,
  scope: AutomationMetricScopeSchema,
  enabled: z.boolean(),
});

export interface AutomationMetricCollectionConfig {
  rules: AutomationMetricCollectionRule[];
}

export const AutomationMetricCollectionConfigSchema = z.object({
  rules: z.array(AutomationMetricCollectionRuleSchema),
});

// Default config: all rules disabled
export const defaultAutomationMetricCollectionConfig: AutomationMetricCollectionConfig = {
  rules: [],
};
