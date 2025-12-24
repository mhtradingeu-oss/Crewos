
import { prisma } from '../../prisma.js';
import type { EventEnvelope } from '../../events/event-bus.js';
import type { ActivityLogFilters, ActivityLogRecord } from '../../../modules/activity-log/activity-log.types.js';
import { buildPagination } from '../../utils/pagination.js';

export const ActivityLogRepository = {
  async appendActivity(event: EventEnvelope): Promise<void> {
    const payload = (event.payload ?? {}) as Record<string, unknown>;
    const module = payload.module ?? event.context?.module ?? event.name.split(".")[0];
    const metaJson = JSON.stringify({
      actorId: payload.actorId ?? event.context?.actorUserId,
      actorRole: payload.actorRole ?? (event.context && "role" in event.context
        ? (event.context as Record<string, unknown>).role
        : undefined),
      tenantId: payload.tenantId ?? event.context?.tenantId,
      brandId: payload.brandId ?? event.context?.brandId,
      action: payload.action ?? event.name,
      module,
      entityType: payload.entityType,
      entityId: payload.entityId,
      metadata: payload.metadata ?? payload,
      context: event.context,
      createdAt: payload.createdAt ?? event.occurredAt,
    });

    await prisma.activityLog.create({
      data: {
        brandId: payload.brandId ?? event.context?.brandId ?? null,
        userId: payload.actorId ?? event.context?.actorUserId ?? null,
        module,
        type: event.name,
        source: event.context?.source ?? "api",
        severity: event.context?.severity ?? "info",
        metaJson,
      },
    });
  },

  async listActivity(filters: ActivityLogFilters = {}): Promise<{ data: ActivityLogRecord[]; total: number; page: number; pageSize: number }> {
    const { brandId, module, userId, type, from, to, page = 1, pageSize = 20 } = filters;
    const { skip, take } = buildPagination({ page, pageSize });

    const where: any = {};
    if (brandId) where.brandId = brandId;
    if (module) where.module = module;
    if (userId) where.userId = userId;
    if (type) where.type = type;
    if (filters.severity) where.severity = filters.severity;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const [total, records] = await prisma.$transaction([
      prisma.activityLog.count({ where }),
      prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
    ]);

    return {
      data: records.map((record) => ({
        id: record.id,
        brandId: record.brandId ?? undefined,
        userId: record.userId ?? undefined,
        module: record.module ?? undefined,
        type: record.type,
        source: record.source ?? undefined,
        severity: record.severity ?? undefined,
        meta: record.metaJson
          ? (JSON.parse(record.metaJson) as Record<string, unknown>)
          : undefined,
        createdAt: record.createdAt,
      })),
      total,
      page,
      pageSize: take,
    };
  },

  async getActivityByEntity(entityType: string, entityId: string): Promise<ActivityLogRecord[]> {
    const records = await prisma.activityLog.findMany({
      where: {
        metaJson: {
          contains: `"entityType":"${entityType}"`,
        },
        metaJson: {
          contains: `"entityId":"${entityId}"`,
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return records.map((record) => ({
      id: record.id,
      brandId: record.brandId ?? undefined,
      userId: record.userId ?? undefined,
      module: record.module ?? undefined,
      type: record.type,
      source: record.source ?? undefined,
      severity: record.severity ?? undefined,
      meta: record.metaJson
        ? (JSON.parse(record.metaJson) as Record<string, unknown>)
        : undefined,
      createdAt: record.createdAt,
    }));
  },
};
