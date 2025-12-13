import type { DomainEvent } from "../../events/domain/types.js";
import { prisma } from "../../prisma.js";
import { ConditionGroup } from "./condition-evaluator.js";

export type AutomationRuleMatch = {
  id: string;
  brandId: string | null;
  name: string;
  triggerEvent: string | null;
  conditionConfig: ConditionGroup | null;
};

function parseConditionConfig(json?: string | null): ConditionGroup | null {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json);
    if (typeof parsed === "object" && parsed !== null) {
      return parsed as ConditionGroup;
    }
  } catch {
    // ignore invalid JSON, fail gracefully for Phase 5.2
  }
  return null;
}

function resolveEventBrandId(event: DomainEvent): string | null {
  return (
    event.meta?.brandId ??
    (event.payload && typeof event.payload === "object" && "brandId" in event.payload
      ? (event.payload as Record<string, unknown>)["brandId"]
      : null) ??
    null
  );
}

export async function findMatchingRules(event: DomainEvent): Promise<AutomationRuleMatch[]> {
  const brandId = resolveEventBrandId(event);
  const rules = await prisma.automationRule.findMany({
    where: {
      enabled: true,
      triggerType: "event",
      AND: [
        {
          OR: [{ triggerEvent: event.name }, { triggerEvent: null }],
        },
        {
          OR: [{ brandId: null }, { brandId }],
        },
      ],
    },
    select: {
      id: true,
      brandId: true,
      name: true,
      triggerEvent: true,
      conditionConfigJson: true,
    },
  });

  return rules.map((rule) => ({
    id: rule.id,
    brandId: rule.brandId,
    name: rule.name,
    triggerEvent: rule.triggerEvent,
    conditionConfig: parseConditionConfig(rule.conditionConfigJson),
  }));
}
