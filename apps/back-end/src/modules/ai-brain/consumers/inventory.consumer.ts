import { registerHandler } from "../../../core/events/event-router.js";
import { InventoryEventType } from "@mh-os/shared";
import { aiContextStore } from "../ai-context/ai-context.store.js";

registerHandler(
  InventoryEventType.STOCK_ADJUSTED,
  async (event: unknown) => {
    await aiContextStore.append({
      metric: "inventory.adjustment",
      companyId: (event as any).companyId,
      delta: (event as any).delta,
      after: (event as any).quantityAfter,
      at: (event as any).occurredAt,
    });
  }
);
