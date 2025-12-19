import { registerHandler } from "../../../core/events/event-router.js";
import { InventoryEventType } from "@mh-os/shared";

import { enqueueAutomationJob } from "../jobs/enqueue-automation-job.js";

registerHandler(
  InventoryEventType.STOCK_ADJUSTED,
  async (event: unknown) => {
    // read-only
    // enqueue automation job
    await enqueueAutomationJob({
      trigger: "INVENTORY_STOCK_ADJUSTED",
      payload: event,
    });
  }
);
