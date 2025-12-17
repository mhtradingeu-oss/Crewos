/* =========================================================
 * AUTOMATION – CANONICAL TYPES (PHASE C)
 * ========================================================= */

/* ---------- EVENT ---------- */

// Use canonical AutomationEvent from @mh-os/shared
export type { AutomationEvent } from '@mh-os/shared';

/* ---------- CONDITIONS ---------- */

// Use canonical AutomationCondition and ConditionEvalResult from @mh-os/shared
export type { AutomationCondition, ConditionEvalResult } from '@mh-os/shared';

/* ---------- ACTIONS ---------- */

export type AutomationAction = {
  type: string;
  params: Record<string, unknown>;
};

export type ActionPlanItem = {
  type: string;
  params: Record<string, unknown>;
  mode: 'PLAN_ONLY'; // execution NOT allowed in Phase C
};

/* ---------- RULE (MATCH RESULT) ---------- */
/**
 * IMPORTANT:
 * RuleMatcher returns *matches*, NOT raw rules.
 * This prevents runtime from touching rule storage logic.
 */

export type AutomationRuleMatch = {
  ruleId: string;
  versionId: string;
  ruleName: string;
  priority: number;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
};

/* ---------- PLAN ---------- */

export type AutomationPlan = {
  event: AutomationEvent;
  matchedRules: Array<{
    ruleId: string;
    versionId: string;
    ruleName: string;
    priority: number;
    condition: ConditionEvalResult;
    plannedActions: ActionPlanItem[];
  }>;
};

/* ---------- RUNTIME RESULT ---------- */

export type AutomationRuntimeResult = {
  plan: AutomationPlan;
  auditId: string;
};
