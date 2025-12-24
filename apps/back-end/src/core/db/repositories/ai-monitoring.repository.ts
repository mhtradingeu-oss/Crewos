// AI Monitoring Repository
import type { Prisma } from "@prisma/client";

export async function findMonitoringEventsByCategory(category: string, limit: number) {
  return prisma.aIMonitoringEvent.findMany({
    where: { category },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function findExecutionLogs(limit: number) {
  return prisma.aIExecutionLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function findExecutionLogsSince(startOfMonth: Date) {
  return prisma.aIExecutionLog.findMany({
    where: { createdAt: { gte: startOfMonth } },
    select: { agentName: true, totalTokens: true, costUsd: true, createdAt: true },
  });
}

export async function findRecentExecutionLogs(limit: number) {
  return prisma.aIExecutionLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function findSafetyEvents(limit: number) {
  return prisma.aISafetyEvent.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function createSystemAlert(data: {
  status: string;
  metric?: Prisma.InputJsonValue;
  agentName?: string;
  engine?: string;
  namespace?: string;
  riskLevel?: string;
}) {
  return prisma.aIMonitoringEvent.create({
    data: {
      category: "SYSTEM_ALERT",
      status: data.status,
      metric: data.metric,
      agentName: data.agentName,
      engine: data.engine,
      namespace: data.namespace,
      riskLevel: data.riskLevel as any,
    },
  });
}
import { Prisma } from "@prisma/client";
import { prisma } from "../../prisma.js";

export async function createExecutionLog(data: Prisma.AIExecutionLogUncheckedCreateInput) {
  return prisma.aIExecutionLog.create({ data });
}

export async function createMonitoringEvent(data: Prisma.AIMonitoringEventUncheckedCreateInput) {
  return prisma.aIMonitoringEvent.create({ data });
}

export async function createSafetyEvent(data: Prisma.AISafetyEventUncheckedCreateInput) {
  return prisma.aISafetyEvent.create({ data });
}

export async function findActiveAgentBudgets(params: {
  agentName?: string | null;
  brandId?: string | null;
  tenantId?: string | null;
}) {
  return prisma.aIAgentBudget.findMany({
    where: {
      agentName: params.agentName ?? undefined,
      brandId: params.brandId ?? undefined,
      tenantId: params.tenantId ?? undefined,
      active: true,
    },
    take: 1,
  });
}

export async function aggregateExecutionCosts(where: Prisma.AIExecutionLogWhereInput) {
  return prisma.aIExecutionLog.aggregate({
    _sum: { costUsd: true, totalTokens: true },
    where,
  });
}

export type InputJsonValue = Prisma.InputJsonValue;
