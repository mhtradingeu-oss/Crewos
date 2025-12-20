// Canonical trigger for INVENTORY_UPDATED for registry test
export const InventoryUpdatedTrigger: AutomationEventTrigger<{ companyId: string; payload: unknown }> = {
  eventType: "INVENTORY_UPDATED",
  buildContext(event) {
    return {
      companyId: event.companyId,
      payload: event.payload,
    };
  },
};
registerTrigger(InventoryUpdatedTrigger);
// Example Inventory Trigger (8.4.1)
// Pure, deterministic, no IO

import type { AutomationEventTrigger } from "@mh-os/shared";
import { registerTrigger } from "../automation/automation.trigger.registry.js";
import { InventoryEventType } from "@mh-os/shared";


export interface InventoryTriggerContext {
  companyId: string;
  payload: unknown;
}



import type { InventoryStockAdjustedEvent } from "@mh-os/shared";

// Use canonical event shape for trigger

export const InventoryStockAdjustedTrigger: AutomationEventTrigger<InventoryStockAdjustedEvent> = {
  eventType: InventoryEventType.STOCK_ADJUSTED,
  buildContext(event) {
    return {
      companyId: event.companyId,
      payload: event,
    };
  },
};

registerTrigger(InventoryStockAdjustedTrigger);

