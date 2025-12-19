import { registerHandler } from "../../../core/events/event-router.js";
import { InventoryEventType } from "@mh-os/shared";

import { analyticsQueue } from "../analytics.queue.js";

registerHandler(
  InventoryEventType.STOCK_ADJUSTED,
  async (event: unknown) => {
    // Type assertion or runtime check can be added if a domain type is available
    await analyticsQueue.push({
      metric: "inventory.adjustment",
      companyId: (event as any).companyId,
      delta: (event as any).delta,
      after: (event as any).quantityAfter,
      at: (event as any).occurredAt,
    });
  }
);
