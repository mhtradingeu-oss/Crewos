// Automation Runtime Repository
// DB-only, NO engine logic, NO actions
// Implements: tryBeginAutomationRun, markActionRunResult, finalizeRun


import { PrismaClient, AutomationRun, AutomationActionRun, AutomationRunStatus, AutomationActionRunStatus } from '@prisma/client';
const prisma = new PrismaClient();

export class AutomationRuntimeRepository {
  /**
   * Creates AutomationRun + AutomationActionRun rows inside a transaction.
   * If idempotencyKey conflict (P2002), returns existing run (idempotent).
   */
  static async tryBeginAutomationRun({ eventType, idempotencyKey, plan, ruleId, ruleVersionId }: {
    eventType: string;
    idempotencyKey: string;
    plan: { actions: Array<{ actionKey: string; actionType: string; config: any }> };
    ruleId: string;
    ruleVersionId: string;
  }): Promise<AutomationRun> {
    try {
      return await prisma.$transaction(async (tx) => {
        const run = await tx.automationRun.create({
          data: {
            eventName: eventType,
            dedupKey: idempotencyKey,
            status: AutomationRunStatus.PENDING,
            rule: { connect: { id: ruleId } },
            ruleVersion: { connect: { id: ruleVersionId } },
            actionRuns: {
              create: plan.actions.map((action, idx) => ({
                actionType: action.actionType,
                status: AutomationActionRunStatus.PENDING,
                actionIndex: idx,
                actionConfigJson: action.config,
                dedupKey: `${idempotencyKey}:${action.actionKey}`,
              })),
            },
          },
          include: { actionRuns: true },
        });
        return run;
      });
    } catch (err: any) {
      if (err.code === 'P2002') {
        // Unique constraint failed, return existing run
        const run = await prisma.automationRun.findFirst({
          where: { dedupKey: idempotencyKey },
          include: { actionRuns: true },
        });
        if (!run) throw err;
        return run;
      }
      throw err;
    }
  }

  /**
   * Updates result for an ActionRun (separate transaction).
   */
  static async markActionRunResult({ actionRunId, result }: {
    actionRunId: string;
    result: { status: AutomationActionRunStatus; output?: any; error?: any };
  }): Promise<AutomationActionRun | null> {
    return prisma.automationActionRun.update({
      where: { id: actionRunId },
      data: {
        status: result.status,
        resultJson: result.output ?? undefined,
        errorJson: result.error ?? undefined,
        finishedAt: new Date(),
      },
    });
  }

  /**
   * Computes aggregate status for AutomationRun.
   */
  static async finalizeRun({ runId }: { runId: string }): Promise<AutomationRun | null> {
    const actionRuns = await prisma.automationActionRun.findMany({
      where: { runId },
      select: { status: true },
    });
    let status: AutomationRunStatus = AutomationRunStatus.SUCCESS;
    if (actionRuns.some(ar => ar.status === AutomationActionRunStatus.FAILED)) status = AutomationRunStatus.FAILED;
    else if (actionRuns.some(ar => ar.status === AutomationActionRunStatus.PENDING || ar.status === AutomationActionRunStatus.RUNNING)) status = AutomationRunStatus.RUNNING;
    return prisma.automationRun.update({
      where: { id: runId },
      data: { status, finishedAt: status !== AutomationRunStatus.RUNNING ? new Date() : undefined },
    });
  }
}
