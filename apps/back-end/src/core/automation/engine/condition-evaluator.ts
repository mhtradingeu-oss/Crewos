import type { DomainEvent } from "../../events/domain/types.js";

/** Supported minimal operators for Phase 5.2. */
export type ConditionOperator = "equals" | "contains" | "exists";

export interface ConditionDefinition {
  path: string;
  op: ConditionOperator;
  value?: unknown;
}

export interface ConditionGroup {
  all?: ConditionDefinition[];
  any?: ConditionDefinition[];
}

export interface ConditionEvaluationResult {
  matches: boolean;
  reasons: string[];
}

function resolvePathValue(event: DomainEvent, path: string): unknown {
  const parts = path.split(".");
  return parts.reduce<unknown>((current, part) => {
    if (current && typeof current === "object") {
      return (current as Record<string, unknown>)[part];
    }
    return undefined;
  }, event as unknown);
}

function evaluateOne(condition: ConditionDefinition, event: DomainEvent): { matches: boolean; reason: string } {
  const actual = resolvePathValue(event, condition.path);
  switch (condition.op) {
    case "equals": {
      const matches = actual === condition.value;
      return {
        matches,
        reason: `${condition.path} ${matches ? "matches" : "does not match"} equals ${JSON.stringify(
          condition.value,
        )}`,
      };
    }
    case "contains": {
      const contains =
        typeof actual === "string"
          ? condition.value !== undefined && actual.includes(String(condition.value))
          : Array.isArray(actual)
          ? condition.value !== undefined && actual.includes(condition.value)
          : false;
      return {
        matches: contains,
        reason: `${condition.path} ${contains ? "contains" : "does not contain"} ${JSON.stringify(
          condition.value,
        )}`,
      };
    }
    case "exists": {
      const exists = actual !== undefined && actual !== null;
      return {
        matches: exists,
        reason: `${condition.path} ${exists ? "exists" : "is missing"}`,
      };
    }
    default:
      return {
        matches: false,
        reason: `${condition.path} unsupported operator ${condition.op}`,
      };
  }
}

export function evaluateConditionGroup(
  group: ConditionGroup | null | undefined,
  event: DomainEvent,
): ConditionEvaluationResult {
  if (!group || (!group.all?.length && !group.any?.length)) {
    return { matches: true, reasons: ["no conditions configured"] };
  }

  const allResults = (group.all ?? []).map((condition) => evaluateOne(condition, event));
  const anyResults = (group.any ?? []).map((condition) => evaluateOne(condition, event));

  const allMatch = allResults.every((result) => result.matches);
  const anyMatch = anyResults.length === 0 ? true : anyResults.some((result) => result.matches);

  const matches = allMatch && anyMatch;
  const reasons = [...allResults, ...anyResults].map((result) => result.reason);

  return { matches, reasons };
}
