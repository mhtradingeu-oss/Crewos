import { registerHandler } from "../../../core/events/event-router";
import { InventoryEventType } from "@mh-os/shared";

registerHandler(
  InventoryEventType.STOCK_ADJUSTED,
  async (event) => {
    // read-only
    // enqueue automation job
    await enqueueAutomationJob({
      trigger: "INVENTORY_STOCK_ADJUSTED",
      payload: event,
    });
  }
);
