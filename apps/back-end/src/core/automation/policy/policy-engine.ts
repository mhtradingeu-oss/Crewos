// PolicyEngine: design-only stub (Phase C.2 Step 4)
// No execution, no side effects, deterministic output.

import type {
  AutomationPolicyInput,
  AutomationPolicyDecision,
} from "@mh-os/shared";

export class PolicyEngine {
  static evaluate(_: AutomationPolicyInput): AutomationPolicyDecision {
    return {
      allowed: false,
      mode: "DISABLED",
      reasons: [
        {
          code: "POLICY.EXECUTION_DISABLED",
          message:
            "Automation execution is disabled by design (Phase C.2 Step 4).",
        },
      ],
    };
  }
}
