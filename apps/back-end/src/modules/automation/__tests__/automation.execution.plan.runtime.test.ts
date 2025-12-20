import { buildAutomationExecutionPlan, AutomationExecutionPlan } from "../automation.execution.plan.js";
import { AutomationRuleDescriptor } from "../automation.trigger.registry.js";

describe("buildAutomationExecutionPlan", () => {
  const rules: readonly AutomationRuleDescriptor[] = [
    { ruleId: "r1", eventType: "E1", companyId: "c1", enabled: true },
    { ruleId: "r2", eventType: "E1", companyId: "c1", enabled: true },
  ];
  const idempotencyKey = "idem-123";

  it("plan length matches rules", () => {
    const plan = buildAutomationExecutionPlan(rules, idempotencyKey);
    expect(plan.length).toBe(rules.length);
  });

  it("deterministic output", () => {
    const plan1 = buildAutomationExecutionPlan(rules, idempotencyKey);
    const plan2 = buildAutomationExecutionPlan(rules, idempotencyKey);
    expect(plan1).toEqual(plan2);
  });

  it("idempotencyKey propagated", () => {
    const plan = buildAutomationExecutionPlan(rules, idempotencyKey);
    expect(plan.every(p => p.triggerIdempotencyKey === idempotencyKey)).toBe(true);
  });

  it("pure + immutable", () => {
    const rulesCopy = [...rules];
    buildAutomationExecutionPlan(rulesCopy, idempotencyKey);
    expect(rulesCopy).toEqual(rules);
  });
});
