// Explainability Projection Layer (DESIGN ONLY)
// Pure, deterministic, stateless, JSON-serializable
import { z } from "zod";
import type { AutomationExplainTrace, ExplainMode } from "./automation-explain.js";

export interface AutomationExplainSummary {
  traceId: string;
  eventName: string;
  allowed: boolean;
  mode: ExplainMode;
  matchedRuleCount: number;
  deniedRuleCount: number;
  reasonCodes: string[];
}

export const AutomationExplainSummarySchema = z.object({
  traceId: z.string(),
  eventName: z.string(),
  allowed: z.boolean(),
  mode: z.string(),
  matchedRuleCount: z.number(),
  deniedRuleCount: z.number(),
  reasonCodes: z.array(z.string()),
});

export interface AutomationExplainNarrative {
  traceId: string;
  headline: string;
  paragraphs: string[];
  conclusion: string;
}

export const AutomationExplainNarrativeSchema = z.object({
  traceId: z.string(),
  headline: z.string(),
  paragraphs: z.array(z.string()),
  conclusion: z.string(),
});

export interface AutomationExplainProjection {
  summary: AutomationExplainSummary;
  narrative?: AutomationExplainNarrative;
}

export const AutomationExplainProjectionSchema = z.object({
  summary: AutomationExplainSummarySchema,
  narrative: AutomationExplainNarrativeSchema.optional(),
});

// Pure projection: summary
export function projectExplainSummary(trace: AutomationExplainTrace): AutomationExplainSummary {
  const matchedRuleCount = trace.matchedRules.length;
  const deniedRuleCount = trace.matchedRules.filter(r => r.decision && r.decision.allowed === false).length;
  const reasonCodes = trace.finalDecision.reasonCodes || [];
  return {
    traceId: trace.traceId,
    eventName: trace.eventName,
    allowed: trace.finalDecision.allowed,
    mode: trace.finalDecision.mode,
    matchedRuleCount,
    deniedRuleCount,
    reasonCodes,
  };
}

// Pure projection: narrative
export function projectExplainNarrative(trace: AutomationExplainTrace): AutomationExplainNarrative {
  const headline = `Automation decision for event '${trace.eventName}' (trace: ${trace.traceId})`;
  const paragraphs: string[] = [];
  for (const rule of trace.matchedRules) {
    const ruleSummary = `Rule '${rule.ruleName || rule.ruleId}' (v${rule.versionId}): ${rule.decision.allowed ? "ALLOWED" : "DENIED"}`;
    paragraphs.push(ruleSummary);
    if (rule.decision.reasonCodes && rule.decision.reasonCodes.length > 0) {
      paragraphs.push(`Reasons: ${rule.decision.reasonCodes.join(", ")}`);
    }
  }
  const conclusion = trace.finalDecision.allowed
    ? "Final decision: ALLOWED."
    : "Final decision: DENIED.";
  return {
    traceId: trace.traceId,
    headline,
    paragraphs,
    conclusion,
  };
}
