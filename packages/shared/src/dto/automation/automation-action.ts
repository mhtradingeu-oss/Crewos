export type AutomationActionStatus =
  | "SUCCESS"
  | "FAILED"
  | "SKIPPED";


export interface AutomationActionResult {
  readonly actionKey: string;
  readonly status: AutomationActionStatus;
  readonly output?: unknown;
  readonly error?: string;
  readonly idempotencyKey?: string;
  readonly subResults?: AutomationActionResult[];
  readonly metadata?: Record<string, unknown>;
}


export interface AutomationActionContext {
  readonly executionId: string;
  readonly idempotencyKey: string;
  readonly companyId: string;
  readonly source: "INVENTORY" | "CRM" | "SYSTEM";
  readonly event?: string;
  readonly payload?: unknown;
  readonly metadata?: Record<string, unknown>;
}

export interface AutomationActionAdapter<TPayload = unknown> {
  readonly key: string;
  execute(
    payload: TPayload,
    context: AutomationActionContext
  ): Promise<AutomationActionResult>;
}
