export async function fetchEngineHealth() {
  return [];
}

export async function fetchTokenUsage() {
  return {};
}

export async function fetchPerformanceMetrics() {
  return null;
}
// V1 placeholder for missing exports
export async function fetchAgentActivity() {
  return [];
}

export async function fetchSystemAlerts() {
  return [];
}
// V1 READ-ONLY — AI MONITORING
import { apiFetch } from "./client.ts";

export async function getEngineHealth() {
  const res = await apiFetch("/ai/monitoring/engine-health");
  return res.data;
}

export async function getAgentActivity() {
  const res = await apiFetch("/ai/monitoring/agent-activity");
  return res.data;
}
