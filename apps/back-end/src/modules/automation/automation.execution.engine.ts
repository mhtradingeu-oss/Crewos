export interface AutomationExecutionStep {
  executionId: string;
  ruleId: string;
  triggerIdempotencyKey: string;
  status: "PENDING";
  // The actual execution logic is injected via context
}

export interface AutomationExecutionContext {
  executeStep: (step: AutomationExecutionStep) => Promise<AutomationStepResult>;
}

export interface AutomationStepResult {
  executionId: string;
  ruleId: string;
  triggerIdempotencyKey: string;
  status: "SUCCESS" | "FAILED";
  error?: string;
}

export interface AutomationExecutionResult {
  results: AutomationStepResult[];
}

export async function executeAutomationPlan(input: {
  plan: AutomationExecutionStep[];
  context: AutomationExecutionContext;
}): Promise<AutomationExecutionResult> {
  const { plan, context } = input;
  const results: AutomationStepResult[] = [];
  for (const step of plan) {
    let result: AutomationStepResult;
    try {
      result = await context.executeStep(step);
      if (!result.status) result.status = "SUCCESS";
    } catch (err: any) {
      result = {
        executionId: step.executionId,
        ruleId: step.ruleId,
        triggerIdempotencyKey: step.triggerIdempotencyKey,
        status: "FAILED",
        error: err?.message || String(err),
      };
    }
    results.push(result);
  }
  return { results };
}
