import type { Prisma } from "@prisma/client";
import { prisma } from "../../prisma.js";
import type {
  ActionConfig,
  ConditionConfig,
} from "../../../modules/automation/automation.types.js";
import type { DomainEvent } from "../../events/domain/types.js";

const ruleSelect = {
  id: true,
  name: true,
  description: true,
  brandId: true,
  triggerEvent: true,
  conditionConfigJson: true,
  actionsConfigJson: true,
} satisfies Prisma.AutomationRuleSelect;

export interface AutomationRuleMatch {
  id: string;
  name: string;
  description?: string;
  brandId?: string;
  triggerEvent?: string;
  conditionConfig?: { all?: ConditionConfig[]; any?: ConditionConfig[] };
  actions?: ActionConfig[];
}

export async function loadMatchingRulesForEvent(event: DomainEvent): Promise<AutomationRuleMatch[]> {
  const mockRules = loadMockRulesFromEnv(event);
  if (mockRules) {
    console.info(
      `[automation][rule-matcher] using ${mockRules.length} mock rule(s) for ${event.type}`,
    );
    return mockRules;
  }

  const brandIdValue = event.meta?.brandId ?? null;

  const where: Prisma.AutomationRuleWhereInput = {
    enabled: true,
    triggerType: "event",
    AND: [
      { OR: [{ triggerEvent: event.type }, { triggerEvent: null }] },
      { OR: [{ brandId: null }, { brandId: brandIdValue }] },
    ],
  };

  const rows = await prisma.automationRule.findMany({
    where,
    select: ruleSelect,
  });

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description ?? undefined,
      brandId: row.brandId ?? undefined,
      triggerEvent: row.triggerEvent ?? undefined,
      conditionConfig: parseConditionConfig(row.conditionConfigJson),
      actions: parseActions(row.actionsConfigJson),
    }));
  }

function parseConditionConfig(
  value?: string | null,
): { all?: ConditionConfig[]; any?: ConditionConfig[] } | undefined {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(value);
    if (typeof parsed !== "object" || parsed === null) return undefined;
    return parsed as { all?: ConditionConfig[]; any?: ConditionConfig[] };
  } catch {
    console.warn("[automation][rule-matcher] invalid condition config JSON");
    return undefined;
  }
}

function parseActions(value?: string | null): ActionConfig[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object") return [];
    const actions = Array.isArray((parsed as { actions?: unknown }).actions)
      ? ((parsed as { actions: unknown }).actions as ActionConfig[])
      : [];
    return actions;
  } catch {
    console.warn("[automation][rule-matcher] invalid actions config JSON");
    return [];
  }
}

function loadMockRulesFromEnv(event: DomainEvent): AutomationRuleMatch[] | undefined {
  const raw = process.env.AUTOMATION_ENGINE_MOCK_RULES;
  if (!raw) return undefined;

  try {
    const candidates = JSON.parse(raw) as AutomationRuleMatch[];
    const filtered = candidates.filter(
      (rule) => !rule.triggerEvent || rule.triggerEvent === event.type,
    );
    return filtered.map((rule) => ({ ...rule, actions: rule.actions ?? [] }));
  } catch (err) {
    console.warn("[automation][rule-matcher] invalid mock rules payload", err);
    return undefined;
  }
}
