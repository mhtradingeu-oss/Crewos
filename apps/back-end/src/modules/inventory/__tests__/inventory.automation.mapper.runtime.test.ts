import { mapInventoryEventToAutomationTrigger } from "../inventory.automation.mapper.js";
import { InventoryStockAdjustedEvent } from "@mh-os/shared";

describe("mapInventoryEventToAutomationTrigger", () => {
  const inventoryEvent: InventoryStockAdjustedEvent = {
    eventId: "evt-123",
    type: "INVENTORY_STOCK_ADJUSTED",
    occurredAt: "2025-12-19T12:00:00Z",
    companyId: "comp-456",
    idempotencyKey: "idem-789",
    // ...other fields as required by InventoryStockAdjustedEvent
  } as InventoryStockAdjustedEvent;

  it("maps inventory event to automation trigger", () => {
    const trigger = mapInventoryEventToAutomationTrigger(inventoryEvent);
    expect(trigger.eventId).toBe(inventoryEvent.eventId);
    expect(trigger.type).toBe(inventoryEvent.type);
    expect(trigger.occurredAt).toBe(inventoryEvent.occurredAt);
    expect(trigger.companyId).toBe(inventoryEvent.companyId);
    expect(trigger.idempotencyKey).toBe(inventoryEvent.idempotencyKey);
    expect(trigger.source).toBe("INVENTORY");
    expect(trigger.payload).toBe(inventoryEvent);
  });

  it("preserves idempotencyKey", () => {
    const trigger = mapInventoryEventToAutomationTrigger(inventoryEvent);
    expect(trigger.idempotencyKey).toBe(inventoryEvent.idempotencyKey);
  });

  it("payload is immutable reference", () => {
    const trigger = mapInventoryEventToAutomationTrigger(inventoryEvent);
    expect(trigger.payload).toBe(inventoryEvent);
  });

  it("source === 'INVENTORY'", () => {
    const trigger = mapInventoryEventToAutomationTrigger(inventoryEvent);
    expect(trigger.source).toBe("INVENTORY");
  });
});
