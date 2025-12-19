import {
  AutomationEventTrigger,
  InventoryEventType,
  InventoryStockAdjustedEvent,
} from "@mh-os/shared";

export function mapInventoryEventToAutomationTrigger(
  event: InventoryStockAdjustedEvent
): AutomationEventTrigger<InventoryStockAdjustedEvent> {
  return {
    eventId: event.eventId,
    source: "INVENTORY",
    type: event.type,
    occurredAt: event.occurredAt,

    companyId: event.companyId,
    idempotencyKey: event.idempotencyKey,

    payload: event,
  };
}
