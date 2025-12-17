// Phase C.2 — Execution DISABLED by architecture
// PLAN-ONLY | NO execution | NO side effects | NO DB | NO retries | NO runners

import type { AutomationPlan } from "@mh-os/shared";

// Local stub for runtime result (not exported from @mh-os/shared)
type AutomationExecutorResult = {
  status: "SKIPPED";
  reason: string;
  actions: unknown[];
  startedAt: null;
  finishedAt: null;
};

export class AutomationExecutor {
  /**
   * Execution is intentionally disabled in Phase C.2.
   * This method exists ONLY to preserve API shape and explainability.
   */
  static async execute(plan: AutomationPlan): Promise<AutomationExecutorResult> {
    return {
      // planId: plan.id, // Removed because 'id' does not exist on AutomationPlan
      status: "SKIPPED",
      reason: "EXECUTION_DISABLED_PHASE_C2",
      actions: [],
      startedAt: null,
      finishedAt: null,
    };
  }
}
