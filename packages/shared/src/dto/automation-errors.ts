const POLICY_KEYWORDS = ["policy", "gate", "violation", "restriction", "blocked", "denied", "review"];
const SYSTEM_KEYWORDS = ["system", "network", "timeout", "service", "database", "internal", "failed", "crash"];

export enum AutomationErrorCode {
  ACTION_FAILED = "ACTION_FAILED",
  POLICY_VIOLATION = "POLICY_VIOLATION",
  SYSTEM_ERROR = "SYSTEM_ERROR",
  UNKNOWN = "UNKNOWN",
}

export type AutomationExecutionErrorMetadata = {
  actionIndex?: number;
  actionType?: string;
};

export type AutomationExecutionErrorContext = AutomationExecutionErrorMetadata & {
  isPolicyViolation?: boolean;
};

export type AutomationExecutionError = {
  code: AutomationErrorCode;
  message: string;
  metadata?: AutomationExecutionErrorMetadata;
};

const hasKeyword = (message: string, keywords: readonly string[]): boolean => {
  const normalized = message.toLowerCase();
  return keywords.some((keyword) => normalized.includes(keyword));
};

const buildMetadata = (context?: AutomationExecutionErrorContext): AutomationExecutionErrorMetadata | undefined => {
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

const determineCode = (message: string, context?: AutomationExecutionErrorContext): AutomationErrorCode => {
  if (context?.isPolicyViolation || hasKeyword(message, POLICY_KEYWORDS)) {
    return AutomationErrorCode.POLICY_VIOLATION;
  }

  if (context?.actionIndex !== undefined || Boolean(context?.actionType)) {
    return AutomationErrorCode.ACTION_FAILED;
  }

  if (hasKeyword(message, SYSTEM_KEYWORDS)) {
    return AutomationErrorCode.SYSTEM_ERROR;
  }

  return AutomationErrorCode.UNKNOWN;
};

export const createAutomationExecutionError = (
  rawMessage: string,
  context?: AutomationExecutionErrorContext,
): AutomationExecutionError => {
  const message = rawMessage.trim() || "Unknown automation error";
  return {
    code: determineCode(message, context),
    message,
    metadata: buildMetadata(context),
  };
};
