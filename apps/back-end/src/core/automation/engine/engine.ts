// Minimal Automation Engine Orchestration (PHASE 6.3)

import {
  createRun,
  createActionRun,
  updateActionRunStatus,
  updateRunStatus,
} from "./run-repository.js";
import { persistExplainSnapshot } from "../audit/automation-explain.store.js";
import { recordAudit } from "../audit/automation-audit.js";
import { automationMetricsCollector } from "../observability/automation-metrics.js";
import type {
  AutomationActionExecutionSummary,
  AutomationExecutionResult,
  AutomationAuditActionFailedPayload,
  AutomationAuditActionStartPayload,
  AutomationAuditActionSuccessPayload,
  AutomationAuditRunEndPayload,
  AutomationAuditRunStartPayload,
  AutomationExplainAction,
  AutomationExplainConditionResult,
  AutomationExplainSnapshot,
  AutomationExplainSnapshotEvent,
  AutomationExplainSnapshotStatus,
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

type ExecuteRuleVersionResult = {
  execution: AutomationExecutionResult;
  explainSnapshot: AutomationExplainSnapshot;
};

/**
 * Executes a rule version for a single-action happy path.
 */

type ActionConfig = {
  type: string;
  params?: unknown;
};

const POLICY_KEYWORDS = [
  "policy",
  "gate",
  "violation",
  "restriction",
  "blocked",
  "denied",
  "review",
];
const SYSTEM_KEYWORDS = [
  "system",
  "network",
  "timeout",
  "service",
  "database",
  "internal",
  "failed",
  "crash",
];

type AutomationExecutionErrorMetadata = {
  actionIndex?: number;
  actionType?: string;
};

type AutomationExecutionErrorContext = AutomationExecutionErrorMetadata & {
  isPolicyViolation?: boolean;
};

enum AutomationErrorCode {
  ACTION_FAILED = "ACTION_FAILED",
  POLICY_VIOLATION = "POLICY_VIOLATION",
  SYSTEM_ERROR = "SYSTEM_ERROR",
  UNKNOWN = "UNKNOWN",
}

type AutomationExecutionError = {
  code: AutomationErrorCode;
  message: string;
  metadata?: AutomationExecutionErrorMetadata;
};

const hasKeyword = (message: string, keywords: readonly string[]): boolean => {
  const normalized = message.toLowerCase();
  return keywords.some((keyword) => normalized.includes(keyword));
};

const buildMetadata = (
  context?: AutomationExecutionErrorContext
): AutomationExecutionErrorMetadata | undefined => {
  if (!context) {
    return undefined;
  }
  const metadata: AutomationExecutionErrorMetadata = {};
  if (context.actionIndex !== undefined) {
    metadata.actionIndex = context.actionIndex;
  }
  if (context.actionType) {
    metadata.actionType = context.actionType;
  }
  return Object.keys(metadata).length ? metadata : undefined;
};

const determineCode = (
  message: string,
  context?: AutomationExecutionErrorContext
): AutomationErrorCode => {
  if (
    context?.isPolicyViolation ||
    hasKeyword(message, POLICY_KEYWORDS)
  ) {
    return AutomationErrorCode.POLICY_VIOLATION;
  }
  if (
    context?.actionIndex !== undefined ||
    Boolean(context?.actionType)
  ) {
    return AutomationErrorCode.ACTION_FAILED;
  }
  if (hasKeyword(message, SYSTEM_KEYWORDS)) {
    return AutomationErrorCode.SYSTEM_ERROR;
  }
  return AutomationErrorCode.UNKNOWN;
};

const createAutomationExecutionError = (
  rawMessage: string,
  context?: AutomationExecutionErrorContext
): AutomationExecutionError => {
  const message = rawMessage.trim() || "Unknown automation error";
  return {
    code: determineCode(message, context),
    message,
    metadata: buildMetadata(context),
  };
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

/**
 * Engine invariants (production-locked final GA):
 *  - A run is always created and recorded before any action is executed so auditing and metrics have a stable reference.
 *  - Action ordering is strict: iterations stop at first failure and every action run record reflects its final status before the next action starts.
 *  - Rule metadata (ruleVersion.id, companyId, actorId) stays immutable for the duration of execution in order to keep downstream reporting deterministic.
 */
export async function executeRuleVersion({
  ruleVersion,
  actorId,
  companyId,
  brandId,
  context,
  actionRunner,
}: ExecuteRuleVersionArgs): Promise<ExecuteRuleVersionResult> {
  if (!ruleVersion.id) {
    throw new Error("ruleVersion.id is required");
  }

  const formatIsoTimestamp = (value?: Date | string | null): string | undefined => {
    if (value === undefined || value === null) return undefined;
    return typeof value === "string" ? value : value.toISOString();
  };

  // 1️⃣ Create Run
  const run = await createRun(
    ruleVersion.id,
    actorId,
    companyId,
    brandId,
    context
  );

  automationMetricsCollector.onRunStart({
    runId: run.id,
    ruleVersionId: ruleVersion.id,
    companyId,
    brandId,
    startedAt: formatIsoTimestamp(run.startedAt),
  });

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
  let executionErrorDetails: AutomationExecutionError | undefined;
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

      automationMetricsCollector.onActionStart({
        runId: run.id,
        actionRunId: actionRun.id,
        actionType: rawAction.type,
        startedAt: formatIsoTimestamp(actionRun.startedAt),
      });

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
        executionErrorDetails =
          executionErrorDetails ??
          createAutomationExecutionError(errorMessage, {
            actionIndex: index,
            actionType: rawAction.type,
          });
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

      automationMetricsCollector.onActionEnd({
        runId: run.id,
        actionRunId: actionRun.id,
        actionType: rawAction.type,
        status: actionSummary.status,
      });

      if (actionSummary.status === "FAILED") {
        break;
      }
    }
  } catch (error) {
    if (!actionError) {
      actionError = getErrorMessage(error);
    }
    if (!executionErrorDetails && actionError) {
      executionErrorDetails = createAutomationExecutionError(actionError);
    }
    runStatus = "FAILED";
  }

  // 6️⃣ Finalize Run
  const updatedRun = await updateRunStatus(run.id, runStatus, actionError);

  const runEndPayload: AutomationAuditRunEndPayload = {
    type: "RUN_END",
    runId: run.id,
    ruleVersionId: ruleVersion.id,
    status: runStatus,
    error: actionError,
  };
  await recordAudit(runEndPayload);

  automationMetricsCollector.onRunEnd({
    runId: run.id,
    ruleVersionId: ruleVersion.id,
    companyId,
    brandId,
    status: runStatus,
    startedAt: formatIsoTimestamp(run.startedAt),
    finishedAt: formatIsoTimestamp(updatedRun.finishedAt ?? run.finishedAt),
  });

  const baseExecutionResult: AutomationExecutionResult = {
    runId: run.id,
    status: runStatus,
    actions: actionSummaries,
    startedAt: run.startedAt?.toISOString(),
    finishedAt: run.finishedAt?.toISOString(),
    error: actionError,
  };

  const executionResult = baseExecutionResult as AutomationExecutionResult & {
    executionError?: AutomationExecutionError;
  };
  if (executionErrorDetails) {
    executionResult.executionError = executionErrorDetails;
  }
  const toIsoString = (value?: Date | string | null): string | undefined => {
    if (value === undefined || value === null) return undefined;
    return typeof value === "string" ? value : value.toISOString();
  };

  const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null;

  const eventSource = isRecord(context) ? context : undefined;
  const eventName =
    (eventSource && typeof eventSource.name === "string"
      ? eventSource.name
      : ruleVersion.triggerEvent) || "";
  const eventOccurredAt =
    eventSource && typeof eventSource.occurredAt === "string"
      ? eventSource.occurredAt
      : toIsoString(run.createdAt) ??
        toIsoString(updatedRun.createdAt) ??
        toIsoString(updatedRun.updatedAt) ??
        toIsoString(run.updatedAt) ??
        new Date().toISOString();
  const eventPayload =
    (eventSource && "payload" in eventSource
      ? eventSource.payload
      : context) ?? null;

  const conditionResult =
    eventSource && "conditionResult" in eventSource
      ? (eventSource.conditionResult as {
          passed?: unknown;
          reason?: unknown;
        })
      : undefined;
  const explainConditions: AutomationExplainConditionResult = Object.freeze({
    passed:
      typeof conditionResult?.passed === "boolean"
        ? conditionResult.passed
        : true,
    reason:
      typeof conditionResult?.reason === "string"
        ? conditionResult.reason
        : undefined,
  });

  const explainActions: readonly AutomationExplainAction[] = actionSummaries.map(
    ({ index, actionType, status, output, error }) =>
      Object.freeze({
        index,
        actionType,
        status,
        output,
        error,
      })
  );

  const explainEvent: AutomationExplainSnapshotEvent = Object.freeze({
    name: eventName,
    occurredAt: eventOccurredAt,
    payload: eventPayload,
  });

  const startedAt =
    toIsoString(run.startedAt) ??
    toIsoString(run.createdAt) ??
    toIsoString(updatedRun.createdAt) ??
    eventOccurredAt;
  const finishedAt =
    toIsoString(updatedRun.finishedAt) ??
    toIsoString(run.finishedAt) ??
    toIsoString(updatedRun.updatedAt) ??
    toIsoString(run.updatedAt) ??
    startedAt;

  /**
   * Explain snapshot immutability is documented and enforced here: every nested object is frozen and the snapshot is persisted once,
   * so consumers can trust that explainability data never changes post-write.
   */
  const explainSnapshot: AutomationExplainSnapshot = Object.freeze({
    runId: run.id,
    companyId,
    brandId,
    ruleVersionId: ruleVersion.id,
    event: explainEvent,
    conditions: explainConditions,
    actions: Object.freeze(explainActions),
    finalStatus: runStatus as AutomationExplainSnapshotStatus,
    startedAt,
    finishedAt,
    error: actionError,
  });

  await persistExplainSnapshot(explainSnapshot);

  return {
    execution: executionResult,
    explainSnapshot,
  };
}
