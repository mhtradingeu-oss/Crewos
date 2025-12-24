// OperationsRepository: Move all prisma queries from operations.service.ts here

import { prisma } from '../../prisma.js';
import type { Prisma } from '@prisma/client';
import { notFound } from '../../http/errors.js';

export const OperationsRepository = {
  async countOpsTasks(where: Prisma.OperationsTaskWhereInput) {
    return prisma.operationsTask.count({ where });
  },
  async listOpsTasks(args: Prisma.OperationsTaskFindManyArgs) {
    return prisma.operationsTask.findMany(args);
  },
  async createOpsTask(args: Prisma.OperationsTaskCreateArgs) {
    return prisma.operationsTask.create(args);
  },
  async updateOpsTask(id: string, brandId: string, input: any, select: any) {
    const existing = await prisma.operationsTask.findFirst({ where: { id, brandId }, select });
    if (!existing) throw notFound('Operations task not found');
    return prisma.operationsTask.update({
      where: { id },
      data: {
        title: input.title ?? existing.title,
        status: input.status ?? existing.status,
        dueDate: input.dueDate ?? existing.dueDate,
      },
      select,
    });
  },
  async updateOpsTaskStatus(id: string, brandId: string, status: string, select: any) {
    const existing = await prisma.operationsTask.findFirst({ where: { id, brandId }, select });
    if (!existing) throw notFound('Operations task not found');
    return prisma.operationsTask.update({
      where: { id },
      data: { status },
      select,
    });
  },
  async listActivityLogs(args: Prisma.ActivityLogFindManyArgs & { where: Prisma.ActivityLogWhereInput }) {
    const [total, rows] = await prisma.$transaction([
      prisma.activityLog.count({ where: args.where }),
      prisma.activityLog.findMany(args),
    ]);
    return [total, rows];
  },
};
