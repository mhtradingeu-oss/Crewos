
import type { AutomationPlan } from "@mh-os/shared";
import type { AutomationRuntimeResult } from "./types.js";
import { DisabledExecutionGate } from "../gate/execution-gate.js";
import { PolicyEngine } from "../policy/policy-engine.js";
export class AutomationRuntime {
  /**
   * Phase C Runtime (aligned to canonical AutomationPlan only)
   * PLAN-ONLY — no execution, no side effects
   */
  run(plan: AutomationPlan): AutomationRuntimeResult {
    // Execution Gate (explainability only)
    const gate = new DisabledExecutionGate();
    const firstRule = plan.matchedRules[0];
    const executionGate = gate.decide({
      tenantId: plan.event.tenantId,
      brandId: plan.event.brandId,
      actorUserId: plan.event.actorUserId,
      eventName: plan.event.name,
      ruleId: firstRule?.ruleId || "",
      versionId: firstRule?.versionId || "",
      actionType: firstRule?.plannedActions[0]?.type,
    });

    // Policy Layer (explainability only)
    const defaultPolicyConfig = {
      enabled: false,
      allowlist: [],
      defaultDeny: true,
    };
    const policyDecision = PolicyEngine.evaluate({
      scope: {
        tenantId: plan.event.tenantId,
        brandId: plan.event.brandId,
        actorUserId: plan.event.actorUserId,
      },
      plan,
      config: defaultPolicyConfig,
    });

    return {
      plan,
      executionGate,
      policyDecision,
    };
  }
}
