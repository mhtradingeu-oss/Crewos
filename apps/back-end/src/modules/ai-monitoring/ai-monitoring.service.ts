import * as aiMonitoringRepo from "../../core/db/repositories/ai-monitoring.repository.js";
import { logger } from "../../core/logger.js";

const DEFAULT_LIMIT = 200;

export async function getEngineHealth(limit = DEFAULT_LIMIT) {
  return aiMonitoringRepo.findMonitoringEventsByCategory("ENGINE_HEALTH", limit);
}

export async function getAgentActivity(limit = DEFAULT_LIMIT) {
  return aiMonitoringRepo.findExecutionLogs(limit);
}

export async function getTokenUsage() {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const rows = await aiMonitoringRepo.findExecutionLogsSince(startOfMonth);
  const usageByAgent: Record<string, { monthTokens: number; monthCost: number; dayTokens: number; dayCost: number }> = {};

  for (const row of rows) {
    const key = row.agentName ?? "unknown";
    if (!usageByAgent[key]) {
      usageByAgent[key] = { monthTokens: 0, monthCost: 0, dayTokens: 0, dayCost: 0 };
    }
    usageByAgent[key].monthTokens += row.totalTokens ?? 0;
    usageByAgent[key].monthCost += row.costUsd ?? 0;
    if (row.createdAt && new Date(row.createdAt) >= startOfDay) {
      usageByAgent[key].dayTokens += row.totalTokens ?? 0;
      usageByAgent[key].dayCost += row.costUsd ?? 0;
    }
  }

  return usageByAgent;
}

export async function getPerformanceMetrics() {
  const rows = await aiMonitoringRepo.findRecentExecutionLogs(DEFAULT_LIMIT);
  const totalLatency = rows.reduce((acc, row) => acc + (row.latencyMs ?? 0), 0);
  const errors = rows.filter((row) => row.status === "ERROR");
  const fallbacks = rows.filter((row) => row.status === "FALLBACK");
  const avgLatency = rows.length ? Math.round(totalLatency / rows.length) : 0;

  return {
    avgLatency,
    totalRequests: rows.length,
    errors: errors.length,
    fallbacks: fallbacks.length,
  };
}

export async function getSystemAlerts(limit = DEFAULT_LIMIT) {
  return aiMonitoringRepo.findMonitoringEventsByCategory("SYSTEM_ALERT", limit);
}

export async function getSafetyEvents(limit = DEFAULT_LIMIT) {
  return aiMonitoringRepo.findSafetyEvents(limit);
}

export async function createSystemAlert(payload: aiMonitoringRepo.SystemAlertPayload) {
  try {
    await aiMonitoringRepo.createSystemAlert({
      status: payload.status,
      metric: payload.metric,
      agentName: payload.agentName,
      engine: payload.engine,
      namespace: payload.namespace,
      riskLevel: payload.riskLevel,
    });
  } catch (err) {
    logger.error(`[ai-monitoring] failed to push alert: ${String(err)}`);
  }
}
