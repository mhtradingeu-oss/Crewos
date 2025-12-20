import type {
  AutomationPlan,
  AutomationPolicyDecision,
  ExecutionGateDecision,
} from '@mh-os/shared';
import type { AutomationExplainTrace } from '@mh-os/shared';

export interface AutomationRuntimeResult {
  plan: AutomationPlan;
  policyDecision?: AutomationPolicyDecision;
  executionGate?: ExecutionGateDecision;
  explain?: AutomationExplainTrace;
  audit?: { auditId: string; kind: "PLAN_TRACE"; captured: boolean };
}
