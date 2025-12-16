import { AutomationCondition, ConditionEvalResult, AutomationEvent } from './types.js';

export class RuleEvaluator {
  evaluateAll(
    event: AutomationEvent,
    conditions: AutomationCondition[]
  ): ConditionEvalResult {
    if (!conditions || conditions.length === 0) {
      return { passed: true };
    }

    for (const c of conditions) {
      if (c.kind !== 'json-logic') {
        return {
          passed: false,
          details: { reason: 'UNSUPPORTED_CONDITION_KIND', kind: c.kind },
        };
      }

      if (c.config && Object.keys(c.config as object).length > 0) {
        return {
          passed: false,
          details: { reason: 'CONDITION_ENGINE_NOT_IMPLEMENTED' },
        };
      }
    }

    return { passed: true, details: { mode: 'PLACEHOLDER_PASS' } };
  }
}
