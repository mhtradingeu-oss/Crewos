// DisabledExecutionGate: always blocks execution (Phase C.2 Step 3)
// Design-only: no execution, no side effects, deterministic output

import type {
  ExecutionGate,
  ExecutionGateContext,
  ExecutionGateDecision,
} from "@mh-os/shared";

export class DisabledExecutionGate implements ExecutionGate {
  decide(ctx: ExecutionGateContext): ExecutionGateDecision {
    return {
      allowed: false,
      mode: "DISABLED",
      reasonCode: "GATE_DISABLED",
      reason: "Execution is disabled in Phase C (PLAN-ONLY).",
    };
  }
}
