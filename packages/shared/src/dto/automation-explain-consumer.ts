// Explainability Consumer Contracts (DESIGN ONLY)
// No logic, no side effects, JSON-serializable only
import { z } from "zod";
import type { AutomationExplainTrace, ExplainLevel } from "./automation-explain.js";
import type { ExplainAudience } from "./automation-explain-policy.js";
import { ExplainAudienceSchema } from "./automation-explain-policy.js";

export type ExplainFormat = "RAW" | "SUMMARY" | "NARRATIVE";
export const ExplainFormatSchema = z.enum(["RAW", "SUMMARY", "NARRATIVE"]);


export interface ExplainConsumerMeta {
  audience?: ExplainAudience;
  locale?: string; // e.g. "en", "de"
}

export const ExplainConsumerMetaSchema = z.object({
  audience: ExplainAudienceSchema.optional(),
  locale: z.string().optional(),
});

export interface AutomationExplainView {
  format: ExplainFormat;
  level: ExplainLevel;
}

export const AutomationExplainViewSchema = z.object({
  format: ExplainFormatSchema,
  level: z.string(), // Use ExplainLevelSchema if you want stricter typing
});

export interface AutomationExplainResponse {
  trace: AutomationExplainTrace;
  view: AutomationExplainView;
  generatedAt: string; // ISO
}

export const AutomationExplainResponseSchema = z.object({
  trace: z.any(), // Should be AutomationExplainTraceSchema if imported
  view: AutomationExplainViewSchema,
  generatedAt: z.string(),
});
