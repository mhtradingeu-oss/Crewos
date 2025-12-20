import { describe, it, expect } from "@jest/globals";
import { resolveTrigger } from "../automation.trigger.registry";

// Ensure InventoryUpdatedTrigger is registered by import side effect
import "../../inventory/inventory.automation.trigger";

describe("Automation Trigger Registry", () => {
  it("resolves trigger by eventType", () => {
    const trigger = resolveTrigger("INVENTORY_UPDATED");
    expect(trigger).toBeDefined();
    expect(trigger?.eventType).toBe("INVENTORY_UPDATED");
  });
});
