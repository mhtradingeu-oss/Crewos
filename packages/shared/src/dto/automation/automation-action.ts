export type AutomationActionStatus =
  | "SUCCESS"
  | "FAILED"
  | "SKIPPED";

export interface AutomationActionResult {
  readonly actionKey: string;
  readonly status: AutomationActionStatus;
  readonly error?: string;
}

export interface AutomationActionContext {
  readonly executionId: string;
  readonly idempotencyKey: string;
  readonly companyId: string;
  readonly source: "INVENTORY" | "CRM" | "SYSTEM";
}

export interface AutomationActionAdapter<TPayload = unknown> {
  readonly key: string;
  execute(
    payload: TPayload,
    context: AutomationActionContext
  ): Promise<AutomationActionResult>;
}
