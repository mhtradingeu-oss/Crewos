import { AutomationEventTrigger } from "@mh-os/shared";

export interface AutomationRuleDescriptor {
  ruleId: string;
  eventType: string;
  companyId: string;
  enabled: boolean;
}

export function resolveAutomationRules(
  trigger: AutomationEventTrigger<any>,
  rules: readonly AutomationRuleDescriptor[]
): AutomationRuleDescriptor[] {
  return rules.filter(
    (rule) =>
      rule.enabled &&
      rule.eventType === trigger.type &&
      rule.companyId === trigger.companyId
  );
}
