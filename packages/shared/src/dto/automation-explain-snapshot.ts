// Canonical, immutable snapshot contract for Automation Explainability (DESIGN-ONLY)
// No logic, no side effects, JSON-serializable only
import { z } from "zod";
import type { AutomationExplainResponse } from "./automation-explain-consumer.js";
import { AutomationExplainResponseSchema } from "./automation-explain-consumer.js";

export interface AutomationExplainSnapshotMeta {
  snapshotId: string; // UUID or unique string
  createdAt: string; // ISO 8601
  source: string; // e.g., "api", "runtime", "replay"
  version: string; // e.g., "v1"
}

export const AutomationExplainSnapshotMetaSchema = z.object({
  snapshotId: z.string(),
  createdAt: z.string(),
  source: z.string(),
  version: z.string(),
});

export interface AutomationExplainSnapshot {
  meta: AutomationExplainSnapshotMeta;
  payload: AutomationExplainResponse;
  audience: string; // e.g., "ADMIN", "USER", etc.
  format: string;   // e.g., "RAW", "SUMMARY", "NARRATIVE"
  checksum: string; // hash/checksum of payload (string only)
}

export const AutomationExplainSnapshotSchema = z.object({
  meta: AutomationExplainSnapshotMetaSchema,
  payload: AutomationExplainResponseSchema,
  audience: z.string(),
  format: z.string(),
  checksum: z.string(),
});
