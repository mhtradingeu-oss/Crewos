import { automationRunRepository } from "./run-repository.js";
import type { AutomationRuleMatch } from "./rule-matcher.js";
import { evaluateConditionGroup } from "./condition-evaluator.js";
import { findMatchingRules } from "./rule-matcher.js";
import type { DomainEvent } from "../../events/domain/types.js";
import type { AutomationRunStatus } from "@prisma/client";

export type AutomationRunResult = {
  ruleId: string;
  runId: string;
  status: AutomationRunStatus;
  reason?: string;
  error?: string;
};

export class AutomationEngine {
  constructor(private readonly runs = automationRunRepository) {}

  async run(event: DomainEvent): Promise<AutomationRunResult[]> {
    const rules = await findMatchingRules(event);
    const outcomes: AutomationRunResult[] = [];

    for (const rule of rules) {
      const run = await this.runs.create({
        ruleId: rule.id,
        brandId: rule.brandId,
        eventName: event.name,
        payload: event.payload,
        meta: event.meta,
      });

      const result = await this.executeRule(rule, event, run.id);
      outcomes.push(result);
    }

    return outcomes;
  }

  private async executeRule(rule: AutomationRuleMatch, event: DomainEvent, runId: string) {
    try {
      await this.runs.updateStatus(runId, "RUNNING");
      const evaluation = evaluateConditionGroup(rule.conditionConfig, event);
      if (!evaluation.matches) {
        await this.runs.updateStatus(runId, "SKIPPED", { trace: evaluation.reasons });
        return {
          ruleId: rule.id,
          runId,
          status: "SKIPPED" as AutomationRunStatus,
          reason: "conditions did not match",
        };
      }

      await this.runs.updateStatus(runId, "SUCCESS", { trace: evaluation.reasons });
      return {
        ruleId: rule.id,
        runId,
        status: "SUCCESS" as AutomationRunStatus,
        reason: "conditions matched; actions pending",
      };
    } catch (error) {
      await this.runs.updateStatus(runId, "FAILED", { error, trace: (error as Error).stack });
      return {
        ruleId: rule.id,
        runId,
        status: "FAILED" as AutomationRunStatus,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

export const automationEngine = new AutomationEngine();
