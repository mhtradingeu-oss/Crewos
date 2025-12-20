// Automation Runtime Orchestrator Service
// Post-commit execution only

import { AutomationRuntimeRepository } from './automation.runtime.repository.js';
// import { AutomationExecutionEngine } from './automation.execution.engine'; // Uncomment and adjust import as needed

export class AutomationRuntimeService {
  /**
   * Orchestrates the automation run lifecycle
   */
  static async beginRun({ eventType, idempotencyKey, plan, ruleId, ruleVersionId, context, registry }: {
    eventType: string;
    idempotencyKey: string;
    plan: { actions: Array<{ actionKey: string; actionType: string; config: any }> };
    ruleId: string;
    ruleVersionId: string;
    context: any;
    registry: any;
  }) {
    // Begin run in DB (transaction)
    const run = await AutomationRuntimeRepository.tryBeginAutomationRun({ eventType, idempotencyKey, plan, ruleId, ruleVersionId });

    // If run is terminal (SUCCESS/FAILED), return it (idempotent)
    if (["SUCCESS", "FAILED"].includes(run.status)) {
      return run;
    }

    // POST-COMMIT: Execute actions (engine)
    // const results = await AutomationExecutionEngine.execute(plan, context, registry);
    // For each action result, persist to DB
    // for (const actionResult of results) {
    //   await AutomationRuntimeRepository.markActionRunResult({
    //     actionRunId: actionResult.actionRunId,
    //     result: actionResult.result,
    //   });
    // }
    // Finalize run status
    // await AutomationRuntimeRepository.finalizeRun({ runId: run.id });

    // Placeholder: Remove comments and implement engine integration
    return run;
  }
}
