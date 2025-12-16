export type AutomationEventName =
  | 'order.created'
  | 'order.paid'
  | 'user.registered'
  | 'price.changed';

export interface AutomationEvent {
  id: string;
  name: AutomationEventName;
  occurredAt: Date;
  tenantId: string; // ✅ REQUIRED for Automation Runtime
  payload: unknown;
  meta?: {
    source?: string;
    correlationId?: string;
  };
}
