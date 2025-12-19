export type AutomationTriggerSource =
  | "INVENTORY"
  | "CRM"
  | "POS"
  | "SYSTEM";

export interface AutomationEventTrigger<TPayload = unknown> {
  readonly eventId: string;
  readonly source: AutomationTriggerSource;
  readonly type: string;
  readonly occurredAt: string;

  readonly companyId: string;
  readonly idempotencyKey: string;

  readonly payload: TPayload;
}
