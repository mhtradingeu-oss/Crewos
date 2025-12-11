import type { Prisma } from "@prisma/client";
import { prisma } from "../../core/prisma.js";
import { buildPagination } from "../../core/utils/pagination.js";
import { communicationService } from "../communication/communication.service.js";
import { logger } from "../../core/logger.js";
import { emitNotificationCreated, emitNotificationRead } from "./notification.events.js";
import type {
  CreateNotificationInput,
  NotificationDeliveryOptions,
  NotificationFilters,
  NotificationRecord,
} from "./notification.types.js";

class NotificationService {
  constructor(private readonly db = prisma) {}

  async createNotification(input: CreateNotificationInput): Promise<NotificationRecord> {
    const created = await this.db.notification.create({
      data: {
        brandId: input.brandId ?? null,
        userId: input.userId ?? null,
        type: input.type ?? null,
        channel: "in-app",
        title: input.title,
        body: input.message,
        status: input.status ?? "unread",
        metaJson: null,
        dataJson: input.data ? JSON.stringify(input.data) : null,
      },
    });

    await emitNotificationCreated({
      notificationId: created.id,
      brandId: created.brandId ?? undefined,
      userId: created.userId ?? undefined,
      type: created.type ?? undefined,
      channel: created.channel ?? undefined,
    });

    return this.map(created);
  }

  async notifyAndOptionallySend(
    input: CreateNotificationInput & NotificationDeliveryOptions & { brandId?: string },
  ): Promise<NotificationRecord> {
    const notification = await this.createNotification(input);
    if (input.deliveryChannel && input.recipient && input.brandId) {
      try {
        await communicationService.sendMessage({
          brandId: input.brandId,
          channel: input.deliveryChannel,
          recipient: input.recipient,
          templateId: input.templateId,
          subject: input.subject,
          body: input.body,
          variables: input.templateVariables,
        });
      } catch (error) {
        logger.warn(
          `[notification] Delivery to ${input.recipient} via ${input.deliveryChannel} failed: ${
            (error as Error).message
          }`,
        );
      }
    }
    return notification;
  }

  async listForUser(
    userId: string,
    filters: NotificationFilters = {},
  ): Promise<{ data: NotificationRecord[]; total: number; page: number; pageSize: number }> {
    const {
      status,
      brandId,
      type,
      unreadOnly,
      page = 1,
      pageSize = 20,
    } = filters;
    const { skip, take } = buildPagination({ page, pageSize });

    const where: Prisma.NotificationWhereInput = {
      OR: [{ userId }, { userId: null }],
    };
    if (unreadOnly) {
      where.status = "unread";
    } else if (status) {
      where.status = status;
    }
    if (brandId) where.brandId = brandId;
    if (type) where.type = type;

    const [total, rows] = await this.db.$transaction([
      this.db.notification.count({ where }),
      this.db.notification.findMany({ where, orderBy: { createdAt: "desc" }, skip, take }),
    ]);

    return {
      data: rows.map((row) => this.map(row)),
      total,
      page,
      pageSize: take,
    };
  }

  async markRead(ids: string[], userId: string): Promise<void> {
    const records = await this.db.notification.findMany({
      where: { id: { in: ids }, OR: [{ userId }, { userId: null }] },
      select: { id: true, brandId: true },
    });
    if (!records.length) {
      return;
    }
    const recordIds = records.map((record) => record.id);
    await this.db.notification.updateMany({
      where: { id: { in: recordIds } },
      data: { status: "read", readAt: new Date() },
    });
    await emitNotificationRead({
      notificationIds: recordIds,
      brandId: records[0]?.brandId ?? undefined,
      userId,
    });
  }

  async markAllReadForUser(userId: string): Promise<void> {
    const records = await this.db.notification.findMany({
      where: { OR: [{ userId }, { userId: null }], status: { not: "read" } },
      select: { id: true, brandId: true },
    });
    if (!records.length) {
      return;
    }
    const recordIds = records.map((record) => record.id);
    await this.db.notification.updateMany({
      where: { id: { in: recordIds } },
      data: { status: "read", readAt: new Date() },
    });
    await emitNotificationRead({
      notificationIds: recordIds,
      brandId: records[0]?.brandId ?? undefined,
      userId,
    });
  }

  private map(row: Prisma.NotificationGetPayload<{}>): NotificationRecord {
    return {
      id: row.id,
      brandId: row.brandId ?? undefined,
      userId: row.userId ?? undefined,
      type: row.type ?? undefined,
      title: row.title,
      message: row.body,
      status: row.status ?? undefined,
      createdAt: row.createdAt,
      readAt: row.readAt ?? undefined,
      data: row.dataJson ? (JSON.parse(row.dataJson) as Record<string, unknown>) : undefined,
    };
  }
}

export const notificationService = new NotificationService();
