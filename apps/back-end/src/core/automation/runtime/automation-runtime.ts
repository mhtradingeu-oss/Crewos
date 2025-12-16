import { AutomationAudit } from '../audit/automation-audit.js';
import { ActionPlanner } from './action-planner.js';
import { RuleEvaluator } from './rule-evaluator.js';
import { AutomationEvent, AutomationRuleMatch, AutomationRuntimeResult } from './types.js';

/**
 * Phase C Runtime: PLAN + AUDIT only.
 * - No execution
 * - No side effects
 * - No AI
 */
export class AutomationRuntime {
  constructor(
    private readonly evaluator = new RuleEvaluator(),
    private readonly planner = new ActionPlanner(),
    private readonly audit = new AutomationAudit()
  ) {}

  /**
   * Input: event + pre-matched rules (from rule matcher in later step)
   * Output: plan + audit id
   */
  runPlanOnly(event: AutomationEvent, matchedRules: AutomationRuleMatch[]): AutomationRuntimeResult {
    const sorted = [...matchedRules].sort((a, b) => b.priority - a.priority);

    const plan = {
      event,
      matchedRules: sorted.map((r) => {
        const condition = this.evaluator.evaluateAll(event, r.conditions);
        const plannedActions = condition.passed ? this.planner.plan(r.actions) : [];
        return {
          ruleId: r.ruleId,
          versionId: r.versionId,
          ruleName: r.ruleName,
          priority: r.priority,
          condition,
          plannedActions,
        };
      }),
    };

    const auditId = this.audit.write(plan);
    return { plan, auditId };
  }
}
