// V1 placeholder for missing export
export const listConstraints = listSafetyConstraints;
// V1 READ-ONLY — AI SAFETY API
// All mutation actions are disabled by design.

import { apiFetch } from "./client.ts";

/**
 * V1: List firewall rules
 */
export async function listFirewallRules() {
  const { data } = await apiFetch("/ai/safety/firewall-rules");
  return data;
}

/**
 * V1: List safety constraints
 */
export async function listSafetyConstraints() {
  const { data } = await apiFetch("/ai/safety/constraints");
  return data;
}

/**
 * V1: List banned actions
 */
export async function listBannedActions() {
  const { data } = await apiFetch("/ai/safety/banned-actions");
  return data;
}

/* =========================
   🚫 MUTATIONS DISABLED (V1)
   ========================= */

export async function createFirewallRule(_: Record<string, unknown>): Promise<null> {
  return null;
}

export async function createConstraint(_: Record<string, unknown>): Promise<null> {
  return null;
}

export async function createBannedAction(_: Record<string, unknown>): Promise<null> {
  throw new Error("V1 READ-ONLY: createBannedAction disabled");
}

export async function submitOversight(_: Record<string, unknown>): Promise<null> {
  throw new Error("V1 READ-ONLY: submitOversight disabled");
}

export async function submitRedTeam(_: Record<string, unknown>): Promise<null> {
  throw new Error("V1 READ-ONLY: submitRedTeam disabled");
}
