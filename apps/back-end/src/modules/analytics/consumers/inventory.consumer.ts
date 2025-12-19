import { registerHandler } from "../../../core/events/event-router";
import { InventoryEventType } from "@mh-os/shared";

registerHandler(
  InventoryEventType.STOCK_ADJUSTED,
  async (event) => {
    await analyticsQueue.push({
      metric: "inventory.adjustment",
      companyId: event.companyId,
      delta: event.delta,
      after: event.quantityAfter,
      at: event.occurredAt,
    });
  }
);
