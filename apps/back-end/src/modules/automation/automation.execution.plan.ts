import { AutomationRuleDescriptor } from "./automation.trigger.registry.js";

export interface AutomationExecutionPlan {
  executionId: string;
  ruleId: string;
  triggerIdempotencyKey: string;
  status: "PENDING";
}

export function buildAutomationExecutionPlan(
  rules: readonly AutomationRuleDescriptor[],
  triggerIdempotencyKey: string
): AutomationExecutionPlan[] {
  return rules.map((rule, idx) => ({
    executionId: `${triggerIdempotencyKey}:${rule.ruleId}:${idx}`,
    ruleId: rule.ruleId,
    triggerIdempotencyKey,
    status: "PENDING",
  }));
}
