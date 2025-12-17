import type {
  AutomationPlan,
  AutomationPolicyDecision,
  ExecutionGateDecision,
} from '@mh-os/shared';

export interface AutomationRuntimeResult {
  plan: AutomationPlan;
  policyDecision?: AutomationPolicyDecision;
  executionGate?: ExecutionGateDecision;
}
