// Explainability Response Assembly (DESIGN ONLY)
// Pure, deterministic, JSON-serializable, no side effects
import type {
  AutomationExplainTrace,
  ExplainLevel,
  ExplainMode,
} from "./automation-explain.js";
import type {
  ExplainAudience,
  AutomationExplainPolicy,
} from "./automation-explain-policy.js";
import type { ExplainFormat } from "./automation-explain-consumer.js";
import type {
  AutomationExplainResponse,
  AutomationExplainView,
} from "./automation-explain-consumer.js";
import {
  projectExplainSummary,
  projectExplainNarrative,
} from "./automation-explain-projection.js";

// Import the function for use, not type
import { applyExplainPolicy } from "./automation-explain-policy.js";

export function assembleExplainResponse(args: {
  trace: AutomationExplainTrace;
  audience: ExplainAudience;
  format: ExplainFormat;
  policy?: AutomationExplainPolicy;
}): AutomationExplainResponse {
  const { trace, audience, format, policy } = args;
  // Default policy: strict deny all
  const effectivePolicy: AutomationExplainPolicy =
    policy || { rules: [], defaultDeny: true };

  let payload: any;
  let view: AutomationExplainView = { format, level: trace.level };
  const generatedAt = new Date().toISOString();

  if (format === "RAW") {
    payload = applyExplainPolicy(trace, effectivePolicy, audience).payload;
    return {
      trace: payload,
      view,
      generatedAt,
    };
  }
  if (format === "SUMMARY") {
    const summary = projectExplainSummary(trace);
    payload = applyExplainPolicy(summary, effectivePolicy, audience).payload;
    return {
      trace: trace, // always include original trace for reference
      view,
      generatedAt,
    };
  }
  if (format === "NARRATIVE") {
    const narrative = projectExplainNarrative(trace);
    payload = applyExplainPolicy(narrative, effectivePolicy, audience).payload;
    return {
      trace: trace, // always include original trace for reference
      view,
      generatedAt,
    };
  }
  if (format === "HYBRID") {
    // For strict contract, just return redacted trace (no extra fields)
    const traceRedacted = applyExplainPolicy(trace, effectivePolicy, audience).payload;
    return {
      trace: traceRedacted,
      view,
      generatedAt,
    };
  }
  // Default fallback: strict
  return {
    trace: applyExplainPolicy(trace, effectivePolicy, audience).payload,
    view,
    generatedAt,
  };
}
