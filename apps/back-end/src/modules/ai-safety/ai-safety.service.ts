import { prisma } from "../../core/prisma.js";
import { recordSafetyEvent } from "../../core/ai/ai-monitoring.js";

export async function listFirewallRules() {
  return prisma.aIPromptFirewallRule.findMany({ orderBy: { createdAt: "desc" } });
}

export async function createFirewallRule(payload: {
  name: string;
  matcherType: string;
  matcherValue: string;
  action: string;
  reason?: string;
  severity?: string;
  tags?: string;
}) {
  return prisma.aIPromptFirewallRule.create({
    data: {
      name: payload.name,
      matcherType: payload.matcherType,
      matcherValue: payload.matcherValue,
      action: payload.action as any,
      reason: payload.reason,
      severity: payload.severity as any,
      tags: payload.tags,
    },
  });
}

export async function listConstraints() {
  return prisma.aISafetyConstraint.findMany({ orderBy: { createdAt: "desc" } });
}

export async function createConstraint(payload: {
  code: string;
  scope?: string;
  description?: string;
  ruleJson?: Record<string, unknown>;
  allowedActions?: string[];
  restrictedDomains?: string[];
  riskScore?: number;
}) {
  return prisma.aISafetyConstraint.create({
    data: {
      code: payload.code,
      scope: payload.scope,
      description: payload.description,
      ruleJson: payload.ruleJson ? JSON.stringify(payload.ruleJson) : undefined,
      allowedActionsJson: payload.allowedActions ? JSON.stringify(payload.allowedActions) : undefined,
      restrictedDomainsJson: payload.restrictedDomains ? JSON.stringify(payload.restrictedDomains) : undefined,
      riskScore: payload.riskScore,
    },
  });
}

export async function listBannedActions() {
  return prisma.aIBannedAction.findMany({ orderBy: { createdAt: "desc" } });
}

export async function createBannedAction(payload: {
  code: string;
  description?: string;
  severity?: string;
  scope?: string;
  mitigation?: string;
}) {
  return prisma.aIBannedAction.create({
    data: {
      code: payload.code,
      description: payload.description,
      severity: payload.severity as any,
      scope: payload.scope,
      mitigation: payload.mitigation,
    },
  });
}

export async function recordOversight(payload: {
  runId?: string;
  agentName?: string;
  namespace?: string;
  decision: string;
  notes?: string;
  riskLevel?: string;
}) {
  await recordSafetyEvent({
    type: "OVERSIGHT",
    action: payload.decision,
    runId: payload.runId,
    agentName: payload.agentName,
    namespace: payload.namespace,
    decision: payload.decision,
    riskLevel: (payload.riskLevel ?? "MEDIUM") as any,
    detail: { notes: payload.notes },
  });
  return { status: "recorded" };
}

export async function recordRedTeamFinding(payload: {
  runId?: string;
  scenario: string;
  outcome?: string;
  severity?: string;
}) {
  await recordSafetyEvent({
    type: "RED_TEAM",
    action: payload.scenario,
    runId: payload.runId,
    decision: payload.outcome ?? "recorded",
    riskLevel: (payload.severity ?? "HIGH") as any,
    detail: { scenario: payload.scenario, outcome: payload.outcome },
  });
  return { status: "recorded" };
}

export async function testPrompt(payload: { prompt: string; mode?: string; context?: Record<string, unknown> }) {
  return {
    status: "ok",
    prompt: payload.prompt,
    mode: payload.mode ?? "safety-check",
    context: payload.context,
  };
}
