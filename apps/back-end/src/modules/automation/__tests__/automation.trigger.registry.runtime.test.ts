// IMPORTANT: force trigger registration
import "../../inventory/inventory.automation.trigger.js";

import { resolveAutomationRules, AutomationRuleDescriptor } from "../automation.trigger.registry.js";
import { AutomationEventTrigger } from "@mh-os/shared";


describe("resolveAutomationRules", () => {
  // Canonical AutomationEventTrigger mock
  const trigger: AutomationEventTrigger<any> = {
    eventType: "INVENTORY_STOCK_ADJUSTED",
    buildContext: () => ({ companyId: "comp-1" })
  };

  const rules: readonly AutomationRuleDescriptor[] = [
    { ruleId: "r1", eventType: "INVENTORY_STOCK_ADJUSTED", companyId: "comp-1", enabled: true },
    { ruleId: "r2", eventType: "INVENTORY_STOCK_ADJUSTED", companyId: "comp-1", enabled: false },
    { ruleId: "r3", eventType: "INVENTORY_STOCK_ADJUSTED", companyId: "comp-2", enabled: true },
    { ruleId: "r4", eventType: "OTHER_EVENT", companyId: "comp-1", enabled: true },
  ];


  it("returns only enabled rules", () => {
    const result = resolveAutomationRules(trigger, rules);
    expect(result.every((r: AutomationRuleDescriptor) => r.enabled)).toBe(true);
  });


  it("matches by eventType + companyId", () => {
    const result = resolveAutomationRules(trigger, rules);
    expect(result).toEqual([
      { ruleId: "r1", eventType: "INVENTORY_STOCK_ADJUSTED", companyId: "comp-1", enabled: true },
    ]);
  });


  it("ignores disabled rules", () => {
    const result = resolveAutomationRules(trigger, rules);
    expect(result.find((r: AutomationRuleDescriptor) => r.ruleId === "r2")).toBeUndefined();
  });

  it("does not mutate input rules array", () => {
    const rulesCopy = [...rules];
    resolveAutomationRules(trigger, rulesCopy);
    expect(rulesCopy).toEqual(rules);
  });
});
