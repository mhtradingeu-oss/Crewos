import type { AutomationRunStatus } from "@prisma/client";
import { prisma } from "../../prisma.js";
import type { DomainEvent } from "../../events/domain/types.js";

export type AutomationRunCreateInput = {
  ruleId: string;
  eventName: string;
  brandId?: string | null;
  payload?: unknown;
  meta?: unknown;
};

export type AutomationRunUpdateInput = {
  trace?: unknown;
  error?: unknown;
};

export class AutomationRunRepository {
  async create(params: AutomationRunCreateInput) {
    return prisma.automationRun.create({
      data: {
        ruleId: params.ruleId,
        brandId: params.brandId ?? null,
        eventName: params.eventName,
        payloadJson: params.payload ?? null,
        metaJson: params.meta ?? null,
      },
    });
  }

  async updateStatus(
    runId: string,
    status: AutomationRunStatus,
    options?: AutomationRunUpdateInput,
  ) {
    return prisma.automationRun.update({
      where: { id: runId },
      data: {
        status,
        traceJson: options?.trace ?? undefined,
        errorMessage: options?.error ? String(options.error) : undefined,
      },
    });
  }
}

export const automationRunRepository = new AutomationRunRepository();
