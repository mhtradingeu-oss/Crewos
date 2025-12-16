/* =========================================================
 * AUTOMATION – CANONICAL TYPES (PHASE C)
 * ========================================================= */

/* ---------- EVENT ---------- */

export type AutomationEvent = {
  name: string;
  occurredAt: string; // ISO string (NOT Date object)
  tenantId: string;
  brandId?: string;
  actorUserId?: string;
  correlationId?: string;
  payload: unknown;
};

/* ---------- CONDITIONS ---------- */

export type AutomationCondition = {
  kind: 'json-logic';
  config: unknown;
};

export type ConditionEvalResult = {
  passed: boolean;
  details?: Record<string, unknown>;
};

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
