// Canonical, immutable Audit Sink contracts for Automation OS
// DESIGN ONLY: no IO, no side effects
import { z } from "zod";
import type { AutomationExplainTrace } from "./automation-explain.js";

export type AutomationAuditLevel = "RULE" | "RUN" | "SYSTEM";
export const AutomationAuditLevelSchema = z.enum(["RULE", "RUN", "SYSTEM"]);

export type AutomationAuditKind = "PLAN_TRACE" | "RUNTIME_RESULT";
export const AutomationAuditKindSchema = z.enum(["PLAN_TRACE", "RUNTIME_RESULT"]);

export interface AutomationAuditRecord {
  auditId: string;
  occurredAt: string; // ISO
  tenantId: string;
  brandId?: string;
  correlationId?: string;
  kind: AutomationAuditKind;
  level: AutomationAuditLevel;
  trace?: AutomationExplainTrace;
  runtimeResult?: Record<string, unknown>;
  meta?: Record<string, unknown>;
}

export const AutomationAuditRecordSchema = z.object({
  auditId: z.string(),
  occurredAt: z.string(),
  tenantId: z.string(),
  brandId: z.string().optional(),
  correlationId: z.string().optional(),
  kind: AutomationAuditKindSchema,
  level: AutomationAuditLevelSchema,
  trace: z.any().optional(),
  runtimeResult: z.record(z.unknown()).optional(),
  meta: z.record(z.unknown()).optional(),
});

export interface AutomationAuditEnvelope {
  record: AutomationAuditRecord;
  schemaVersion: 1;
}

export const AutomationAuditEnvelopeSchema = z.object({
  record: AutomationAuditRecordSchema,
  schemaVersion: z.literal(1),
});

export interface AutomationAuditSink {
  capture(envelope: AutomationAuditEnvelope): Promise<void>;
}

export type AutomationAuditRunStartPayload = {
  type: "RUN_START";
  runId: string;
  ruleVersionId: string;
  actorId: string;
};

export type AutomationAuditActionStartPayload = {
  type: "ACTION_START";
  actionRunId: string;
  runId: string;
  actionType: string;
  index: number;
};

export type AutomationAuditActionSuccessPayload = {
  type: "ACTION_SUCCESS";
  actionRunId: string;
  runId: string;
  actionType: string;
  index: number;
};

export type AutomationAuditActionFailedPayload = {
  type: "ACTION_FAILED";
  actionRunId: string;
  runId: string;
  actionType: string;
  index: number;
  error?: string;
};

export type AutomationAuditRunEndPayload = {
  type: "RUN_END";
  runId: string;
  ruleVersionId: string;
  status: "SUCCESS" | "FAILED";
  error?: string;
};

export type AutomationAuditPayload =
  | AutomationAuditRunStartPayload
  | AutomationAuditActionStartPayload
  | AutomationAuditActionSuccessPayload
  | AutomationAuditActionFailedPayload
  | AutomationAuditRunEndPayload;
