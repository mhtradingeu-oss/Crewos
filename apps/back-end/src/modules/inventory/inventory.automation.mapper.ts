import {
  AutomationEventTrigger,
  InventoryEventType,
  InventoryStockAdjustedEvent,
} from "@mh-os/shared";

export function mapInventoryEventToAutomationTrigger(
  event: InventoryStockAdjustedEvent
): AutomationEventTrigger<InventoryStockAdjustedEvent> {
  return {
    eventType: event.type,
    buildContext: (e) => ({
      companyId: e.companyId,
      payload: e,
    })
  };
}
