import type {
  AutomationActionContext,
  AutomationActionResult,
} from "@mh-os/shared";
import { resolveAction } from "./actions/action.registry.js";

export interface AutomationActionInvocation<TPayload = unknown> {
  readonly actionKey: string;
  readonly payload: TPayload;
}

export class AutomationExecutionEngine {
  async execute<TPayload>(
    actions: ReadonlyArray<AutomationActionInvocation<TPayload>>,
    context: AutomationActionContext
  ): Promise<AutomationActionResult[]> {
    const results: AutomationActionResult[] = [];
    for (const action of actions) {
      const executionResult = await this.executeAction(action, context);
      results.push(executionResult);
    }
    return results;
  }

  private async executeAction<TPayload>(
    action: AutomationActionInvocation<TPayload>,
    context: AutomationActionContext
  ): Promise<AutomationActionResult> {
    const adapter = resolveAction(action.actionKey);
    if (!adapter) {
      return {
        actionKey: action.actionKey,
        status: "SKIPPED",
      };
    }

    try {
      const adapterResult = await adapter.execute(action.payload, context);
      return {
        actionKey: adapter.key,
        status: adapterResult.status ?? "SUCCESS",
        error: adapterResult.error,
      };
    } catch (error) {
      return {
        actionKey: adapter.key,
        status: "FAILED",
        error: formatErrorMessage(error),
      };
    }
  }
}

const formatErrorMessage = (value: unknown): string => {
  if (value instanceof Error) {
    return value.message;
  }
  if (typeof value === "string") {
    return value;
  }
  if (value === undefined || value === null) {
    return "Unknown automation action error";
  }
  return String(value);
};
