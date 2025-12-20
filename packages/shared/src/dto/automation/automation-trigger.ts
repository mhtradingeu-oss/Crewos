// Canonical Automation Trigger Contract (8.4.1)
// Strict, pure, extensible, and immutable

export interface AutomationEventTrigger<TEvent = unknown> {
  eventType: string;
  buildContext(event: TEvent): {
    companyId: string;
    payload?: unknown;
  };
}
