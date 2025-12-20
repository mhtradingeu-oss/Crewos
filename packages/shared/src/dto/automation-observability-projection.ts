// Canonical, immutable projection + aggregation contracts for Automation Observability (DESIGN-ONLY)
// No logic, no side effects, JSON-serializable only
import { z } from "zod";

export type AutomationMetricAggregateOp = "COUNT" | "SUM" | "AVG" | "MIN" | "MAX" | "P95";
export const AutomationMetricAggregateOpSchema = z.enum(["COUNT", "SUM", "AVG", "MIN", "MAX", "P95"]);

export type AutomationMetricWindowUnit = "SECOND" | "MINUTE" | "HOUR" | "DAY";
export const AutomationMetricWindowUnitSchema = z.enum(["SECOND", "MINUTE", "HOUR", "DAY"]);

export interface AutomationMetricWindow {
  size: number; // int > 0
  unit: AutomationMetricWindowUnit;
  mode: "ROLLING" | "FIXED";
}

export const AutomationMetricWindowSchema = z.object({
  size: z.number().int().positive(),
  unit: AutomationMetricWindowUnitSchema,
  mode: z.enum(["ROLLING", "FIXED"]),
});

export type AutomationMetricGroupByKey =
  | "tenantId"
  | "brandId"
  | "eventName"
  | "ruleId"
  | "versionId"
  | "actionType"
  | "status";

export const AutomationMetricGroupByKeySchema = z.enum([
  "tenantId",
  "brandId",
  "eventName",
  "ruleId",
  "versionId",
  "actionType",
  "status",
]);

export interface AutomationMetricProjectionSpec {
  id: string;
  name: string;
  sourceMetric: string;
  op: AutomationMetricAggregateOp;
  window: AutomationMetricWindow;
  groupBy?: AutomationMetricGroupByKey[];
  filter?: Record<string, unknown>;
}

export const AutomationMetricProjectionSpecSchema = z.object({
  id: z.string(),
  name: z.string(),
  sourceMetric: z.string(),
  op: AutomationMetricAggregateOpSchema,
  window: AutomationMetricWindowSchema,
  groupBy: z.array(AutomationMetricGroupByKeySchema).optional(),
  filter: z.record(z.unknown()).optional(),
});

export interface AutomationMetricAggregatePoint {
  windowStart: string; // ISO
  windowEnd: string;   // ISO
  value: number;
}

export const AutomationMetricAggregatePointSchema = z.object({
  windowStart: z.string(),
  windowEnd: z.string(),
  value: z.number(),
});

export interface AutomationMetricAggregateSeries {
  specId: string;
  group?: Partial<Record<AutomationMetricGroupByKey, string>>;
  points: AutomationMetricAggregatePoint[];
}

export const AutomationMetricAggregateSeriesSchema = z.object({
  specId: z.string(),
  group: z.record(z.string()).optional(),
  points: z.array(AutomationMetricAggregatePointSchema),
});

export interface AutomationMetricProjectionResult {
  generatedAt: string; // ISO
  window: AutomationMetricWindow;
  series: AutomationMetricAggregateSeries[];
}

export const AutomationMetricProjectionResultSchema = z.object({
  generatedAt: z.string(),
  window: AutomationMetricWindowSchema,
  series: z.array(AutomationMetricAggregateSeriesSchema),
});

// Pure deterministic DESIGN-ONLY helper
export function projectMetricSeries(input: {
  spec: AutomationMetricProjectionSpec;
  events: unknown[];
}): AutomationMetricAggregateSeries {
  // DESIGN ONLY: return empty points, group if possible
  let group: Partial<Record<AutomationMetricGroupByKey, string>> | undefined = undefined;
  if (input.spec.groupBy && input.spec.groupBy.length > 0) {
    group = {};
    for (const key of input.spec.groupBy) {
      group[key] = ""; // DESIGN ONLY: no event parsing
    }
  }
  return {
    specId: input.spec.id,
    group,
    points: [],
  };
}
