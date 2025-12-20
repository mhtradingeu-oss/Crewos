// Canonical AutomationRuleDescriptor for event bridge/plan
export interface AutomationRuleDescriptor {
  ruleId: string;
  eventType: string;
  companyId: string;
  enabled: boolean;
}
// Canonical AutomationRuleDescriptor for event bridge/plan
export interface AutomationRuleDescriptor {
  ruleId: string;
  eventType: string;
  companyId: string;
  enabled: boolean;
}

// Canonical rule resolver for event bridge/plan
export function resolveAutomationRules(
  event: { eventType: string; buildContext: (event: any) => { companyId: string } },
  rules: readonly AutomationRuleDescriptor[]
): AutomationRuleDescriptor[] {
  // Accepts canonical AutomationEventTrigger and rules, returns enabled rules matching eventType and companyId
  const ctx = event.buildContext ? event.buildContext(event) : { companyId: (event as any).companyId };
  return rules.filter(
    (r) => r.enabled && r.eventType === event.eventType && r.companyId === ctx.companyId
  );
}

import type { AutomationEventTrigger } from "@mh-os/shared";

const triggerRegistry = new Map<string, AutomationEventTrigger<any>>();

export function registerTrigger<TEvent>(trigger: AutomationEventTrigger<TEvent>): void {
  triggerRegistry.set(trigger.eventType, trigger as AutomationEventTrigger<any>);
}

export function resolveTrigger<TEvent = any>(eventType: string): AutomationEventTrigger<TEvent> | undefined {
  return triggerRegistry.get(eventType) as AutomationEventTrigger<TEvent> | undefined;
}
