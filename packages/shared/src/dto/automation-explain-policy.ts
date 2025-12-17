// Explainability Access Policy & Redaction (DESIGN ONLY)
// Pure, deterministic, stateless, JSON-serializable
import { z } from "zod";

// Audience
export type ExplainAudience =
  | "INTERNAL"
  | "ADMIN"
  | "PARTNER"
  | "END_USER"
  | "AI";
export const ExplainAudienceSchema = z.enum([
  "INTERNAL",
  "ADMIN",
  "PARTNER",
  "END_USER",
  "AI",
]);

// Policy Rule
export interface ExplainVisibilityRule {
  audience: ExplainAudience;
  allowFields: string[];
  redactFields?: string[];
}

export const ExplainVisibilityRuleSchema = z.object({
  audience: ExplainAudienceSchema,
  allowFields: z.array(z.string()),
  redactFields: z.array(z.string()).optional(),
});

// Policy Config
export interface AutomationExplainPolicy {
  rules: ExplainVisibilityRule[];
  defaultDeny: boolean;
}

export const AutomationExplainPolicySchema = z.object({
  rules: z.array(ExplainVisibilityRuleSchema),
  defaultDeny: z.boolean(),
});

// Redaction Result
export interface AutomationExplainRedactionResult<T> {
  audience: ExplainAudience;
  redacted: boolean;
  payload: T;
}

export const AutomationExplainRedactionResultSchema = z.object({
  audience: ExplainAudienceSchema,
  redacted: z.boolean(),
  payload: z.unknown(),
});

// Pure, deterministic redaction function
export function applyExplainPolicy<T>(
  payload: T,
  policy: AutomationExplainPolicy,
  audience: ExplainAudience
): AutomationExplainRedactionResult<T> {
  // Find rule for audience
  const rule = policy.rules.find((r) => r.audience === audience);
  if (!rule) {
    return {
      audience,
      redacted: policy.defaultDeny,
      payload: policy.defaultDeny ? redactAll(payload) : payload,
    };
  }
  // Redact fields if needed
  let redacted = false;
  let result: any = { ...payload };
  if (rule.redactFields && rule.redactFields.length > 0) {
    for (const field of rule.redactFields) {
      if (field in result) {
        result[field] = "***";
        redacted = true;
      }
    }
  }
  // Remove fields not in allowFields (redact, not delete)
  for (const key of Object.keys(result)) {
    if (!rule.allowFields.includes(key)) {
      result[key] = "***";
      redacted = true;
    }
  }
  return {
    audience,
    redacted,
    payload: result,
  };
}

function redactAll<T>(obj: T): T {
  if (obj && typeof obj === "object") {
    const out: any = {};
    for (const key of Object.keys(obj as any)) {
      out[key] = "***";
    }
    return out;
  }
  return ("***" as unknown) as T;
}
