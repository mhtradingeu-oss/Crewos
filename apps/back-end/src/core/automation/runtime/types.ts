export type AutomationEvent = {
  name: string;
  occurredAt: string;
  tenantId: string;
  brandId?: string;
  actorUserId?: string;
  correlationId?: string;
  payload: unknown;
};

export type AutomationCondition = {
  kind: 'json-logic';
  config: unknown;
};

export type AutomationAction = {
  type: string;
  params: Record<string, unknown>;
};

export type AutomationRuleMatch = {
  ruleId: string;
  versionId: string;
  ruleName: string;
  priority: number;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
};

export type ConditionEvalResult = {
  passed: boolean;
  details?: Record<string, unknown>;
};

export type ActionPlanItem = {
  type: string;
  params: Record<string, unknown>;
  mode: 'PLAN_ONLY';
};

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

export type AutomationRuntimeResult = {
  plan: AutomationPlan;
  auditId: string;
};
