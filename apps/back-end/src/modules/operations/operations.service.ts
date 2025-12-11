import type { Prisma } from "@prisma/client";
import { prisma } from "../../core/prisma.js";
import { buildPagination } from "../../core/utils/pagination.js";
import { badRequest, notFound } from "../../core/http/errors.js";
import { logger } from "../../core/logger.js";
import type {
  ActivityLogDTO,
  ActivityLogListParams,
  ActivityLogListResponse,
  CreateOperationsTaskInput,
  OperationsTaskDTO,
  OperationsTaskListParams,
  OperationsTaskListResponse,
  UpdateOperationsTaskInput,
} from "./operations.types.js";

const taskSelect = {
  id: true,
  brandId: true,
  title: true,
  status: true,
  dueDate: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.OperationsTaskSelect;

const activitySelect = {
  id: true,
  brandId: true,
  userId: true,
  module: true,
  type: true,
  source: true,
  severity: true,
  metaJson: true,
  createdAt: true,
} satisfies Prisma.ActivityLogSelect;

function parseMeta(value: string | null): unknown {
  if (!value) return undefined;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function toTaskDTO(record: Prisma.OperationsTaskGetPayload<{ select: typeof taskSelect }>): OperationsTaskDTO {
  return {
    id: record.id,
    brandId: record.brandId ?? undefined,
    title: record.title,
    status: record.status ?? undefined,
    dueDate: record.dueDate ?? undefined,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function toActivityLogDTO(record: Prisma.ActivityLogGetPayload<{ select: typeof activitySelect }>): ActivityLogDTO {
  return {
    id: record.id,
    brandId: record.brandId ?? undefined,
    userId: record.userId ?? undefined,
    module: record.module ?? undefined,
    type: record.type,
    source: record.source ?? undefined,
    severity: record.severity ?? undefined,
    meta: parseMeta(record.metaJson),
    createdAt: record.createdAt,
  };
}

export const operationsService = {
  async listTasks(params: OperationsTaskListParams): Promise<OperationsTaskListResponse> {
    if (!params.brandId) {
      throw badRequest("brandId is required");
    }

    const { status, dueFrom, dueTo, search, page = 1, pageSize = 20, brandId } = params;
    const { skip, take } = buildPagination({ page, pageSize });

    const where: Prisma.OperationsTaskWhereInput = { brandId };
    if (status) where.status = status;
    if (dueFrom || dueTo) {
      where.dueDate = {};
      if (dueFrom) where.dueDate.gte = dueFrom;
      if (dueTo) where.dueDate.lte = dueTo;
    }
    if (search) {
      where.title = { contains: search, mode: "insensitive" };
    }

    const [total, rows] = await prisma.$transaction([
      prisma.operationsTask.count({ where }),
      prisma.operationsTask.findMany({
        where,
        select: taskSelect,
        orderBy: { updatedAt: "desc" },
        skip,
        take,
      }),
    ]);

    return {
      items: rows.map(toTaskDTO),
      total,
      page,
      pageSize: take,
    };
  },

  async createTask(input: CreateOperationsTaskInput): Promise<OperationsTaskDTO> {
    const created = await prisma.operationsTask.create({
      data: {
        brandId: input.brandId,
        title: input.title,
        status: input.status ?? "OPEN",
        dueDate: input.dueDate ?? null,
      },
      select: taskSelect,
    });

    logger.info(`[operations] Created task ${created.id} for brand ${input.brandId}`);
    return toTaskDTO(created);
  },

  async updateTask(id: string, brandId: string, input: UpdateOperationsTaskInput): Promise<OperationsTaskDTO> {
    const existing = await prisma.operationsTask.findFirst({
      where: { id, brandId },
      select: taskSelect,
    });
    if (!existing) throw notFound("Operations task not found");

    const updated = await prisma.operationsTask.update({
      where: { id },
      data: {
        title: input.title ?? existing.title,
        status: input.status ?? existing.status,
        dueDate: input.dueDate ?? existing.dueDate,
      },
      select: taskSelect,
    });

    logger.info(`[operations] Updated task ${id}`);
    return toTaskDTO(updated);
  },

  async completeTask(id: string, brandId: string): Promise<OperationsTaskDTO> {
    const existing = await prisma.operationsTask.findFirst({
      where: { id, brandId },
      select: taskSelect,
    });
    if (!existing) throw notFound("Operations task not found");

    const completed = await prisma.operationsTask.update({
      where: { id },
      data: { status: "COMPLETED" },
      select: taskSelect,
    });

    logger.info(`[operations] Completed task ${id}`);
    return toTaskDTO(completed);
  },

  async listActivityLogs(params: ActivityLogListParams): Promise<ActivityLogListResponse> {
    if (!params.brandId) {
      throw badRequest("brandId is required");
    }

    const { module, type, severity, dateFrom, dateTo, page = 1, pageSize = 20, brandId } = params;
    const { skip, take } = buildPagination({ page, pageSize });

    const where: Prisma.ActivityLogWhereInput = { brandId };
    if (module) where.module = module;
    if (type) where.type = type;
    if (severity) where.severity = severity;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = dateFrom;
      if (dateTo) where.createdAt.lte = dateTo;
    }

    const [total, rows] = await prisma.$transaction([
      prisma.activityLog.count({ where }),
      prisma.activityLog.findMany({
        where,
        select: activitySelect,
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
    ]);

    return {
      items: rows.map(toActivityLogDTO),
      total,
      page,
      pageSize: take,
    };
  },
};
