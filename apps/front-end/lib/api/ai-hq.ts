// V1 PLACEHOLDER — EXECUTION DISABLED
// All API logic is disabled for V1 read-only build.

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

export async function getAutonomyStatus(): Promise<AutonomyStatus | null> {
  return null;
}

export async function getAutonomyPending(): Promise<unknown[]> {
  return [];
}

export async function approveAutonomyTask(_taskId: string): Promise<null> {
  return null;
}

export async function rejectAutonomyTask(_taskId: string, _reason?: string): Promise<null> {
  return null;
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
