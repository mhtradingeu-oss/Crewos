import type { Prisma } from "@prisma/client";
import { ActivityLogRepository } from "../../core/db/repositories/activity-log.repository.js";
import { buildPagination } from "../../core/utils/pagination.js";
import type { EventEnvelope } from "../../core/events/event-bus.js";
import type { ActivityLogFilters, ActivityLogRecord } from "./activity-log.types.js";
import type { ActivityPayload } from "../../core/activity/activity.js";

class ActivityLogService {
  async record(event: EventEnvelope): Promise<void> {
    await ActivityLogRepository.appendActivity(event);
  }

  async list(
    filters: ActivityLogFilters = {},
  ): Promise<{ data: ActivityLogRecord[]; total: number; page: number; pageSize: number }> {
    return ActivityLogRepository.listActivity(filters);
  }
}

export const activityLogService = new ActivityLogService();
