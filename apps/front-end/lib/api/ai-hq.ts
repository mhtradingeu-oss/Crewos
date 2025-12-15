import { api } from "./client.ts";

export type AutonomyStatus = {
  lastRunAt?: string;
  globalAutonomyEnabled: boolean;
  totalPending: number;
  totalExecuted: number;
  totalRejected: number;
  pendingApproval: unknown[];
  blocked: unknown[];
  queued: unknown[];
  running: unknown[];
  completed: unknown[];
};

export async function getAutonomyStatus() {
  const { data } = await api.get<AutonomyStatus>("/ai/autonomy/status");
  return data;
}

export async function getAutonomyPending(params?: {
  severity?: "low" | "medium" | "high";
  brandId?: string;
  type?: string;
  limit?: number;
  offset?: number;
}) {
  const { data } = await api.get("/ai/autonomy/pending", { params });
  return data as unknown[];
}

export async function approveAutonomyTask(taskId: string) {
  const { data } = await api.post(`/ai/autonomy/approve/${taskId}`);
  return data;
}

export async function rejectAutonomyTask(taskId: string, reason?: string) {
  const { data } = await api.post(`/ai/autonomy/reject/${taskId}`, { reason });
  return data;
}


export async function runAutonomyCycle(payload?: {
  brandId?: string;
  tenantId?: string;
  autoExecute?: boolean;
  dryRun?: boolean;
  includeEmbeddings?: boolean;
}) {
  const response = await api.post(`/ai/autonomy/run-cycle`, payload ?? {});
  return response.data;
}


export async function getAutonomyConfig() {
  const response = await api.get(`/ai/autonomy/config`);
  return response.data as { globalAutonomyEnabled: boolean; defaultAutonomyLevelPerAgent?: string };
}


export async function updateAutonomyConfig(payload: { globalAutonomyEnabled?: boolean }) {
  const response = await api.post(`/ai/autonomy/config`, payload);
  return response.data;
}

export type AgentConfigOverride = {
  autonomyLevel?: "AUTO_DISABLED" | "AUTO_LOW_RISK_ONLY" | "AUTO_FULL";
  maxRiskLevel?: "low" | "medium" | "high";
  enabledContexts?: string[];
  notes?: string;
  brandId?: string;
};

export async function listAgentConfigs(params?: { brandId?: string }) {
  const { data } = await api.get(`/ai/agents/config`, { params });
  return data as any[];
}

export async function getAgentConfig(agentId: string, params?: { brandId?: string }) {
  const { data } = await api.get(`/ai/agents/config/${agentId}`, { params });
  return data as any;
}

export async function updateAgentConfig(agentId: string, payload: AgentConfigOverride) {
  const { data } = await api.post(`/ai/agents/config/${agentId}`, payload);
  return data as any;
}
