// Canonical Execution Gate DTOs for Automation Runtime (Phase C.2 Step 3)
// All types are serializable, immutable, and explainable.

export type ExecutionGateMode = "DISABLED" | "ENABLED";

export type ExecutionGateReasonCode =
  | "GATE_DISABLED"
  | "POLICY_BLOCK"
  | "MISSING_SCOPE"
  | "UNKNOWN";

// Minimal PolicyViolation if not present in shared already
type PolicyViolation = {
  code: string;
  message: string;
};

export interface ExecutionGateDecision {
  allowed: boolean;
  mode: ExecutionGateMode;
  reasonCode: ExecutionGateReasonCode;
  reason: string;
  violations?: PolicyViolation[];
}

export interface ExecutionGateContext {
  tenantId: string;
  brandId?: string;
  actorUserId?: string;
  eventName: string;
  ruleId: string;
  versionId: string;
  actionType?: string;
}

export interface ExecutionGate {
  decide(ctx: ExecutionGateContext): ExecutionGateDecision;
}
