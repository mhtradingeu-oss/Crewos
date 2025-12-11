import { prisma } from "../../core/prisma.js";
import { logger } from "../../core/logger.js";
import type { Prisma } from "@prisma/client";

export async function getEngineHealth(limit = 50) {
  return prisma.aIMonitoringEvent.findMany({
    where: { category: "ENGINE_HEALTH" },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getAgentActivity(limit = 100) {
  return prisma.aIExecutionLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getTokenUsage() {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const rows = await prisma.aIExecutionLog.findMany({
    where: { createdAt: { gte: startOfMonth } },
    select: { agentName: true, totalTokens: true, costUsd: true, createdAt: true },
  });
  const usageByAgent: Record<string, { monthTokens: number; monthCost: number; dayTokens: number; dayCost: number }> = {};
  for (const row of rows) {
    const key = row.agentName ?? "unknown";
    if (!usageByAgent[key]) usageByAgent[key] = { monthTokens: 0, monthCost: 0, dayTokens: 0, dayCost: 0 };
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
  const rows = await prisma.aIExecutionLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });
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

export async function getSystemAlerts(limit = 50) {
  return prisma.aIMonitoringEvent.findMany({
    where: { category: "SYSTEM_ALERT" },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getSafetyEvents(limit = 100) {
  return prisma.aISafetyEvent.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function pushSystemAlert(payload: {
  status: string;
  metric?: Record<string, unknown>;
  agentName?: string;
  engine?: string;
  namespace?: string;
  riskLevel?: string;
}) {
  try {
    await prisma.aIMonitoringEvent.create({
      data: {
        category: "SYSTEM_ALERT",
        status: payload.status,
        metric: payload.metric as Prisma.InputJsonValue | undefined,
        agentName: payload.agentName,
        engine: payload.engine,
        namespace: payload.namespace,
        riskLevel: payload.riskLevel as any,
      },
    });
  } catch (err) {
    logger.error(`[ai-monitoring] failed to push alert: ${String(err)}`);
  }
}
