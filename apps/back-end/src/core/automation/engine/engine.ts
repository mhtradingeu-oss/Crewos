// Minimal Automation Engine Orchestration (PHASE 6.3)

import {
  createRun,
  createActionRun,
  updateActionRunStatus,
  updateRunStatus,
} from "./run-repository.js";
import { recordAudit } from "../audit/automation-audit.js";
import type {
  AutomationActionExecutionSummary,
  AutomationExecutionResult,
  AutomationAuditActionFailedPayload,
  AutomationAuditActionStartPayload,
  AutomationAuditActionSuccessPayload,
  AutomationAuditRunEndPayload,
  AutomationAuditRunStartPayload,
  AutomationRuleVersion,
} from "@mh-os/shared";

/**
 * 🔒 ExecuteRuleVersion arguments
 * companyId is MANDATORY at type level (tenant-safe by construction)
 */
type ExecuteRuleVersionArgs = {
  ruleVersion: AutomationRuleVersion;
  actorId: string;
  companyId: string; // 🔒 mandatory
  brandId?: string;
  context?: unknown;
  actionRunner: (actionType: string, params: unknown) => Promise<unknown>;
};

/**
 * Executes a rule version for a single-action happy path.
 */

type ActionConfig = {
  type: string;
  params?: unknown;
};

const getErrorMessage = (error: unknown): string => {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }
  return String(error ?? "Unknown error");
};

const isActionConfig = (value: unknown): value is ActionConfig => {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as { type?: unknown };
  return typeof candidate.type === "string";
};

export async function executeRuleVersion({
  ruleVersion,
  actorId,
  companyId,
  brandId,
  context,
  actionRunner,
}: ExecuteRuleVersionArgs): Promise<AutomationExecutionResult> {
  if (!ruleVersion.id) {
    throw new Error("ruleVersion.id is required");
  }

  // 1️⃣ Create Run
  const run = await createRun(
    ruleVersion.id,
    actorId,
    companyId,
    brandId,
    context
  );

  const runStartPayload: AutomationAuditRunStartPayload = {
    type: "RUN_START",
    runId: run.id,
    ruleVersionId: ruleVersion.id,
    actorId,
  };

  await recordAudit(runStartPayload);

  const rawActions = Array.isArray(ruleVersion.actionsConfigJson)
    ? ruleVersion.actionsConfigJson
    : [];
  if (rawActions.length === 0) {
    throw new Error("No actions defined in rule version");
  }

  const actionSummaries: AutomationActionExecutionSummary[] = [];

  let actionError: string | undefined;
  let runStatus: AutomationExecutionResult["status"] = "SUCCESS";

  try {
    for (let index = 0; index < rawActions.length; index += 1) {
      const rawAction = rawActions[index];
      if (!isActionConfig(rawAction)) {
        throw new Error(`Invalid action definition at index ${index}`);
      }

      const actionRun = await createActionRun(
        run.id,
        rawAction.type,
        "PENDING",
        rawAction.params
      );

      const actionStartPayload: AutomationAuditActionStartPayload = {
        type: "ACTION_START",
        actionRunId: actionRun.id,
        runId: run.id,
        actionType: rawAction.type,
        index,
      };
      await recordAudit(actionStartPayload);

      let actionSummary: AutomationActionExecutionSummary;

      try {
        const actionResult = await actionRunner(
          rawAction.type,
          rawAction.params
        );

        await updateActionRunStatus(actionRun.id, "SUCCESS", actionResult);

        const actionSuccessPayload: AutomationAuditActionSuccessPayload = {
          type: "ACTION_SUCCESS",
          actionRunId: actionRun.id,
          runId: run.id,
          actionType: rawAction.type,
          index,
        };
        await recordAudit(actionSuccessPayload);

        actionSummary = {
          actionRunId: actionRun.id,
          index,
          actionType: rawAction.type,
          status: "SUCCESS",
          output: actionResult,
        };
      } catch (error) {
        const errorMessage = getErrorMessage(error);
        actionError = errorMessage;
        runStatus = "FAILED";

        await updateActionRunStatus(
          actionRun.id,
          "FAILED",
          undefined,
          errorMessage
        );

        const actionFailedPayload: AutomationAuditActionFailedPayload = {
          type: "ACTION_FAILED",
          actionRunId: actionRun.id,
          runId: run.id,
          actionType: rawAction.type,
          index,
          error: errorMessage,
        };
        await recordAudit(actionFailedPayload);

        actionSummary = {
          actionRunId: actionRun.id,
          index,
          actionType: rawAction.type,
          status: "FAILED",
          error: errorMessage,
        };
      }

      actionSummaries.push(actionSummary);

      if (actionSummary.status === "FAILED") {
        break;
      }
    }
  } catch (error) {
    if (!actionError) {
      actionError = getErrorMessage(error);
    }
    runStatus = "FAILED";
  }

  // 6️⃣ Finalize Run
  await updateRunStatus(run.id, runStatus, actionError);

  const runEndPayload: AutomationAuditRunEndPayload = {
    type: "RUN_END",
    runId: run.id,
    ruleVersionId: ruleVersion.id,
    status: runStatus,
    error: actionError,
  };
  await recordAudit(runEndPayload);

  const result: AutomationExecutionResult = {
    runId: run.id,
    status: runStatus,
    actions: actionSummaries,
    startedAt: run.startedAt?.toISOString(),
    finishedAt: run.finishedAt?.toISOString(),
    error: actionError,
  };

  return result;
}
