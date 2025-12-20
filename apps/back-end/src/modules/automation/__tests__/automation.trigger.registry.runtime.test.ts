import { resolveAutomationRules, AutomationRuleDescriptor } from "../automation.trigger.registry.js";
import { AutomationEventTrigger } from "@mh-os/shared";

describe("resolveAutomationRules", () => {
  const trigger: AutomationEventTrigger<any> = {
    eventId: "evt-1",
    source: "INVENTORY",
    type: "INVENTORY_STOCK_ADJUSTED",
    occurredAt: "2025-12-19T12:00:00Z",
    companyId: "comp-1",
    idempotencyKey: "idemp-1",
    payload: {},
  };

  const rules: readonly AutomationRuleDescriptor[] = [
    { ruleId: "r1", eventType: "INVENTORY_STOCK_ADJUSTED", companyId: "comp-1", enabled: true },
    { ruleId: "r2", eventType: "INVENTORY_STOCK_ADJUSTED", companyId: "comp-1", enabled: false },
    { ruleId: "r3", eventType: "INVENTORY_STOCK_ADJUSTED", companyId: "comp-2", enabled: true },
    { ruleId: "r4", eventType: "OTHER_EVENT", companyId: "comp-1", enabled: true },
  ];

  it("returns only enabled rules", () => {
    const result = resolveAutomationRules(trigger, rules);
    expect(result.every(r => r.enabled)).toBe(true);
  });

  it("matches by eventType + companyId", () => {
    const result = resolveAutomationRules(trigger, rules);
    expect(result).toEqual([
      { ruleId: "r1", eventType: "INVENTORY_STOCK_ADJUSTED", companyId: "comp-1", enabled: true },
    ]);
  });

  it("ignores disabled rules", () => {
    const result = resolveAutomationRules(trigger, rules);
    expect(result.find(r => r.ruleId === "r2")).toBeUndefined();
  });

  it("does not mutate input rules array", () => {
    const rulesCopy = [...rules];
    resolveAutomationRules(trigger, rulesCopy);
    expect(rulesCopy).toEqual(rules);
  });
});
