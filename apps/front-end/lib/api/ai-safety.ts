import { api } from "./client.ts";

export async function listFirewallRules() {
  const res = await api.get("/ai/safety/firewall-rules");
  return res.data;
}

export async function createFirewallRule(payload: Record<string, unknown>) {
  const res = await api.post("/ai/safety/firewall-rules", payload);
  return res.data;
}

export async function listConstraints() {
  const res = await api.get("/ai/safety/constraints");
  return res.data;
}

export async function createConstraint(payload: Record<string, unknown>) {
  const res = await api.post("/ai/safety/constraints", payload);
  return res.data;
}

export async function listBannedActions() {
  const res = await api.get("/ai/safety/banned-actions");
  return res.data;
}

export async function createBannedAction(payload: Record<string, unknown>) {
  const res = await api.post("/ai/safety/banned-actions", payload);
  return res.data;
}

export async function submitOversight(payload: Record<string, unknown>) {
  const res = await api.post("/ai/safety/oversight", payload);
  return res.data;
}

export async function submitRedTeam(payload: Record<string, unknown>) {
  const res = await api.post("/ai/safety/red-team", payload);
  return res.data;
}
