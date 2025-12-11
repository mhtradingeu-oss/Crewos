export type ConditionOperator = "eq" | "neq" | "gt" | "lt" | "includes";

export interface ConditionConfig {
  path: string;
  op: ConditionOperator;
  value?: unknown;
}

export interface ActionConfig {
  type: string;
  params?: Record<string, unknown>;
}

export interface CreateAutomationInput {
  name: string;
  description?: string;
  brandId?: string;
  triggerType: "event" | "schedule";
  triggerEvent?: string;
  triggerConfig?: Record<string, unknown>;
  conditionConfig?: {
    all?: ConditionConfig[];
    any?: ConditionConfig[];
  };
  actions: ActionConfig[];
  isActive?: boolean;
  createdById?: string;
}

export interface UpdateAutomationInput extends Partial<CreateAutomationInput> {}

export interface AutomationRuleRecord {
  id: string;
  name: string;
  description?: string;
  brandId?: string;
  triggerType: "event" | "schedule";
  triggerEvent?: string;
  triggerConfig?: Record<string, unknown>;
  conditionConfig?: { all?: ConditionConfig[]; any?: ConditionConfig[] };
  actions: ActionConfig[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastRunAt?: Date;
  lastRunStatus?: string;
}

export interface AutomationEventPayload {
  id: string;
}
