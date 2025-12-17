
import {
  AutomationEvent,
  AutomationRuleMatch,
  AutomationRuntimeResult,
  AutomationPlan,
  AutomationCondition,
  ConditionEvalResult,
} from './types.js';

import { JsonLogicConditionEvaluator } from '../conditions/json-logic-evaluator.js';

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
        // Evaluate all conditions for this rule
        const conditionResults = this.conditionEvaluator.evaluateConditions(
          rule.conditions as AutomationCondition[],
          event
        );
        const allPassed = conditionResults.every(res => res.passed);
        return {
          ruleId: rule.ruleId,
          versionId: rule.versionId,
          ruleName: rule.ruleName,
          priority: rule.priority,
          condition: {
            passed: allPassed,
            details: { results: conditionResults },
          },
          plannedActions: allPassed
            ? rule.actions.map(action => ({
                type: action.type,
                params: action.params,
                mode: 'PLAN_ONLY',
              }))
            : [],
        };
      }),
    };

    return {
      plan,
      auditId: `audit_${Date.now()}`,
    };
  }
}
