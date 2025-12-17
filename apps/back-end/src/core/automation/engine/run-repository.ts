
import { Prisma } from "@prisma/client";
import type { AutomationActionRunStatus, AutomationRunStatus } from "@prisma/client";
import { prisma } from "../../prisma.js";
import { randomUUID } from "crypto";

// NOTE: If you see 'Cannot find module "cuid"', run: npm install cuid

  // Create a new AutomationRun
  // Scopes: companyId, brandId (if provided)
  export async function createRun(
    ruleVersionId: string,
    actorId: string,
    companyId: string,
    brandId?: string,
    context?: unknown
  ) {
    // Only persist fields present in schema; context is stored in triggerEventJson if provided
    return prisma.automationRun.create({
      data: {
        ruleVersionId,
        ruleId: await getRuleIdForVersion(ruleVersionId),
        eventName: "", // required, but not in input; set empty
        status: "PENDING",
        triggerEventJson: context ? (context as Prisma.InputJsonValue) : undefined,
        // No companyId/brandId fields in AutomationRun, so only context in triggerEventJson
      },
    });
  }

  // Update AutomationRun status (and error if provided)
  export async function updateRunStatus(
    runId: string,
    status: AutomationRunStatus,
    error?: unknown
  ) {
    return prisma.automationRun.update({
      where: { id: runId },
      data: {
        status,
        errorJson: error ? (error as Prisma.InputJsonValue) : undefined,
        finishedAt: ["SUCCESS", "FAILED", "PARTIAL", "SKIPPED"].includes(status) ? new Date() : undefined,
      },
    });
  }

  // Create a new AutomationActionRun for a run
export async function createActionRun(
  runId: string,
  actionKey: string,
  status: AutomationActionRunStatus = "PENDING",
  input?: unknown
) {
  // actionType is required, use actionKey; actionConfigJson is required, use input or {}
  // dedupKey is required and must be unique; use crypto.randomUUID for uniqueness
  return prisma.automationActionRun.create({
    data: {
      runId,
      actionIndex: 0, // minimal, real index not provided
      actionType: actionKey,
      status,
      actionConfigJson: input ? (input as Prisma.InputJsonValue) : Prisma.JsonNull,
      dedupKey: randomUUID(),
    },
  });
}

  // Update AutomationActionRun status (and output/error if provided)
  export async function updateActionRunStatus(
    actionRunId: string,
    status: AutomationActionRunStatus,
    output?: unknown,
    error?: unknown
  ) {
    return prisma.automationActionRun.update({
      where: { id: actionRunId },
      data: {
        status,
        resultJson: output ? (output as Prisma.InputJsonValue) : undefined,
        errorJson: error ? (error as Prisma.InputJsonValue) : undefined,
        finishedAt: ["SUCCESS", "FAILED", "SKIPPED"].includes(status) ? new Date() : undefined,
      },
    });
  }

  // Helper: get ruleId for a ruleVersionId
  async function getRuleIdForVersion(ruleVersionId: string): Promise<string> {
    const version = await prisma.automationRuleVersion.findUnique({
      where: { id: ruleVersionId },
      select: { ruleId: true },
    });
    if (!version) throw new Error("RuleVersion not found");
    return version.ruleId;
  }
