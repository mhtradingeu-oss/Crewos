import { api } from "./client.ts";

export async function fetchEngineHealth() {
  const res = await api.get("/ai/monitoring/engine-health");
  return res.data;
}

export async function fetchAgentActivity() {
  const res = await api.get("/ai/monitoring/agent-activity");
  return res.data;
}

export async function fetchTokenUsage() {
  const res = await api.get("/ai/monitoring/token-usage");
  return res.data;
}

export async function fetchPerformanceMetrics() {
  const res = await api.get("/ai/monitoring/performance-metrics");
  return res.data;
}

export async function fetchSystemAlerts() {
  const res = await api.get("/ai/monitoring/system-alerts");
  return res.data;
}
