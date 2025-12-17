import { Prisma } from "@prisma/client";
import type { AutomationActionRunStatus, AutomationRunStatus } from "@prisma/client";
import { prisma } from "../../prisma.js";


  // Deleted: forbidden by architecture (no local interface/type for automation run creation)


  // Deleted: forbidden by architecture (no local interface/type for automation run creation)


export async function markRunRunning(runId: string) {
  await prisma.automationRun.update({
    where: { id: runId },
    data: { status: "RUNNING", startedAt: new Date() },
  });
}

export async function finalizeAutomationRun(params: {
  runId: string;
  status: AutomationRunStatus;
  summary: unknown;
  error?: unknown;
}) {
  await prisma.automationRun.update({
    where: { id: params.runId },
    data: {
      status: params.status,
      finishedAt: new Date(),
      summaryJson: jsonOrNull(params.summary),
      errorJson: jsonOrNull(params.error),
    },
  });
}

  // Deleted: forbidden by architecture (no local actionConfig/actionType logic)


  // Deleted: forbidden by architecture (no local actionConfig/actionType logic)


function jsonOrNull(value: unknown): Prisma.InputJsonValue {
  if (value === undefined) {
    return Prisma.JsonNull as unknown as Prisma.InputJsonValue;
  }
  return value as Prisma.InputJsonValue;
}

export async function findActionRunByDedupKey(dedupKey: string) {
  return prisma.automationActionRun.findUnique({ where: { dedupKey } });
}

export async function updateRuleLastRun(ruleId: string, status: AutomationRunStatus) {
  await prisma.automationRule.update({
    where: { id: ruleId },
    data: { lastRunAt: new Date(), lastRunStatus: status },
  });
}
