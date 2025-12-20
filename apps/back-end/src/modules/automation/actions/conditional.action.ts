import type {
  AutomationActionAdapter,
  AutomationActionContext,
  AutomationActionResult,
  ConditionalActionPayload,
  ConditionalPredicate
} from "@mh-os/shared";

// Utility: safely get value at path (dot notation) from object
function getByPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc !== null && typeof acc === "object" && Object.prototype.hasOwnProperty.call(acc, key)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
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


export interface ActionExecutor {
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
        // Ensure deterministic execution order by sorting actions by key
        const sortedBranch = [...branch].sort((a, b) => {
          if (
            typeof a === 'object' && a !== null && 'key' in a &&
            typeof b === 'object' && b !== null && 'key' in b
          ) {
            return String(a.key).localeCompare(String(b.key));
          }
          return 0;
        });
        const subResults: AutomationActionResult[] = [];
        for (const action of sortedBranch) {
          // Each action is executed with the same context (read-only)
          const result = await executor.executeAction(action, context);
          subResults.push(result);
        }
        return {
          actionKey: "conditional",
          status: "SUCCESS",
          idempotencyKey: context.idempotencyKey,
          subResults,
          metadata: context.metadata,
        };
      } catch (error) {
        return {
          actionKey: "conditional",
          status: "FAILED",
          idempotencyKey: context.idempotencyKey,
          error: error instanceof Error ? error.message : String(error),
          metadata: context.metadata,
        };
      }
    },
  };
}
