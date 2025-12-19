import { registerHandler } from "../../../core/events/event-router";
import { InventoryEventType } from "@mh-os/shared";

registerHandler(
  InventoryEventType.STOCK_ADJUSTED,
  async (event) => {
    await aiContextStore.append({
      type: "inventory",
      signal: "stock-adjusted",
      data: event,
    });
  }
);
