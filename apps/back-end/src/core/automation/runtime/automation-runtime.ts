import type {
  AutomationEvent,
  AutomationRuleMatch,
  AutomationRuntimeResult,
  AutomationPlan,
  AutomationCondition,
  ConditionEvalResult,
} from "./types.js";

import { JsonLogicConditionEvaluator } from "../conditions/json-logic-evaluator.js";
import { DisabledExecutionGate } from "../gate/execution-gate.js";

export class AutomationRuntime {
  private readonly conditionEvaluator = new JsonLogicConditionEvaluator();

  /**
   * Phase C Runtime
   * PLAN-ONLY — no execution, no side effects
   */
  async run(
    event: AutomationEvent,
    matchedRules: AutomationRuleMatch[]
  ): Promise<AutomationRuntimeResult> {
    const plan: AutomationPlan = {
      event,
      matchedRules: matchedRules.map(rule => {
        // 1️⃣ Evaluate conditions
        const conditionResults: ConditionEvalResult[] =
          this.conditionEvaluator.evaluateConditions(
            rule.conditions as AutomationCondition[],
            event
          );

        const allPassed = conditionResults.every(r => r.passed);

        // 2️⃣ Extract first failure reason (if any)
        const failed = conditionResults.find(r => !r.passed);
        const reason = failed?.reason;

        return {
          ruleId: rule.ruleId,
          versionId: rule.versionId,
          ruleName: rule.ruleName,
          priority: rule.priority,

          condition: {
            passed: allPassed,
            reason,
          },

          plannedActions: allPassed
            ? rule.actions.map(action => ({
                type: action.type,
                params: action.params,
                mode: "PLAN_ONLY",
              }))
            : [],
        };
      }),
    };

    // Phase C.2 Step 3: Execution Gate (explainability only)
    const gate = new DisabledExecutionGate();
    const executionGate = gate.decide({
      tenantId: event.tenantId,
      brandId: event.brandId,
      actorUserId: event.actorUserId,
      eventName: event.name,
      ruleId: matchedRules[0]?.ruleId || "",
      versionId: matchedRules[0]?.versionId || "",
      actionType: matchedRules[0]?.actions[0]?.type,
    });

    return {
      plan,
      auditId: `audit_${Date.now()}`,
      executionGate,
    };
  }
}
