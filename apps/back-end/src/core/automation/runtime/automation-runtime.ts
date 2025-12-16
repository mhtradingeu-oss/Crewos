import {
  AutomationEvent,
  AutomationRuleMatch,
  AutomationRuntimeResult,
  AutomationPlan,
} from './types.js';

export class AutomationRuntime {
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
      matchedRules: matchedRules.map(rule => ({
        ruleId: rule.ruleId,
        versionId: rule.versionId,
        ruleName: rule.ruleName,
        priority: rule.priority,
        condition: {
          passed: true, // Phase C: condition engine stub
        },
        plannedActions: rule.actions.map(action => ({
          type: action.type,
          params: action.params,
          mode: 'PLAN_ONLY',
        })),
      })),
    };

    return {
      plan,
      auditId: `audit_${Date.now()}`,
    };
  }
}
