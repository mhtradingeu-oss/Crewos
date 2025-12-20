import { InventoryStockAdjustedTrigger } from "../inventory.automation.trigger.js";
import type { InventoryStockAdjustedEvent } from "@mh-os/shared";

describe("InventoryStockAdjustedTrigger", () => {
  const inventoryEvent: InventoryStockAdjustedEvent = {
    eventId: "evt-123",
    type: "INVENTORY_STOCK_ADJUSTED",
    occurredAt: "2025-12-19T12:00:00Z",
    companyId: "comp-456",
    idempotencyKey: "idem-789",
  } as InventoryStockAdjustedEvent;

  it("exposes correct eventType", () => {
    expect(InventoryStockAdjustedTrigger.eventType).toBe(
      "INVENTORY_STOCK_ADJUSTED"
    );
  });

  it("builds canonical automation context", () => {
    const context = InventoryStockAdjustedTrigger.buildContext(inventoryEvent);

    expect(context.companyId).toBe(inventoryEvent.companyId);
    expect(context.payload).toBe(inventoryEvent); // immutable reference
  });
});
