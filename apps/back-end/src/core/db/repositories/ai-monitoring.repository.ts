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
