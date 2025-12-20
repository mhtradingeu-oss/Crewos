import type {
  AutomationActionAdapter,
  AutomationActionContext,
  AutomationActionResult,
  ConditionalActionPayload,
  ConditionalPredicate
} from "@mh-os/shared";

// Utility: safely get value at path (dot notation) from object
function getByPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce((acc, key) =>
    acc && typeof acc === "object" && key in acc ? (acc as any)[key] : undefined,
    obj
  );
}

function evaluatePredicate(predicate: ConditionalPredicate, context: unknown): boolean {
  switch (predicate.type) {
    case "exists":
      return getByPath(context, predicate.path) !== undefined;
    case "equals":
      return getByPath(context, predicate.path) === predicate.value;
    case "contains": {
      const val = getByPath(context, predicate.path);
      if (typeof val === "string") return val.includes(String(predicate.value));
      if (Array.isArray(val)) return val.includes(predicate.value);
      return false;
    }
    default:
      return false;
  }
}

interface ActionExecutor {
  executeAction(
    action: unknown,
    context: AutomationActionContext
  ): Promise<AutomationActionResult>;
}

export function createConditionalAction(
  executor: ActionExecutor
): AutomationActionAdapter<ConditionalActionPayload> {
  return {
    key: "conditional",
    async execute(payload, context) {
      try {
        const { predicate, thenActions, elseActions } = payload;
        const branch = evaluatePredicate(predicate, context)
          ? thenActions
          : elseActions ?? [];
        const subResults: AutomationActionResult[] = [];
        for (const action of branch) {
          // Each action is executed with the same context (read-only)
          const result = await executor.executeAction(action, context);
          subResults.push(result);
        }
        return {
          actionKey: "conditional",
          status: "SUCCESS",
          idempotencyKey: context.idempotencyKey,
          subResults,
        };
      } catch (error) {
        return {
          actionKey: "conditional",
          status: "FAILED",
          idempotencyKey: context.idempotencyKey,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
  };
}
