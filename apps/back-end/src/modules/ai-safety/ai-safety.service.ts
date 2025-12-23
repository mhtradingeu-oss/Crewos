import * as aiSafetyRepository from "../../core/db/repositories/ai-safety.repository.js";
import { recordSafetyEvent } from "../../core/ai/ai-monitoring.js";

export async function listFirewallRules() {
  return aiSafetyRepository.listFirewallRules();
}

export async function createFirewallRule(payload: aiSafetyRepository.FirewallRulePayload) {
  return aiSafetyRepository.createFirewallRule(payload);
}

export async function listConstraints() {
  return aiSafetyRepository.listConstraints();
}

export async function createConstraint(payload: aiSafetyRepository.SafetyConstraintPayload) {
  return aiSafetyRepository.createConstraint(payload);
}

export async function listBannedActions() {
  return aiSafetyRepository.listBannedActions();
}

export async function createBannedAction(payload: aiSafetyRepository.BannedActionPayload) {
  return aiSafetyRepository.createBannedAction(payload);
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
