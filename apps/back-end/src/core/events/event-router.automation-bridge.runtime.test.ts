import { jest, describe, it, expect } from "@jest/globals";
import { InventoryEventType } from "@mh-os/shared";

/**
 * 🔒 Canonical ESM mocks
 * MUST be declared before any imports
 */
jest.unstable_mockModule(
  "../../modules/automation/automation.trigger.registry.js",
  () => ({
    resolveTrigger: jest.fn(),
  })
);

jest.unstable_mockModule(
  "../../modules/automation/automation.runtime.service.js",
  () => ({
    AutomationRuntimeService: {
      beginRun: jest.fn().mockResolvedValue({
        id: "run-1",
        status: "PENDING",
        actionRuns: [],
      }),
    },
  })
);

/**
 * Dynamic ESM imports AFTER mocks
 */
const registry = await import(
  "../../modules/automation/automation.trigger.registry.js"
);
const bridge = await import(
  "../../modules/automation/automation.event.bridge.js"
);
const runtime = await import(
  "../../modules/automation/automation.runtime.service.js"
);

import { routeEvent } from "./event-router.js";

describe("event-router → automation bridge integration", () => {
  it("does not call runtime if trigger is missing", async () => {
    (registry.resolveTrigger as jest.Mock).mockReturnValue(undefined);

    const event = {
      type: InventoryEventType.STOCK_ADJUSTED,
      companyId: "c1",
      payload: { x: 1 },
    };

    const runSpy = jest.spyOn(
      runtime.AutomationRuntimeService,
      "beginRun"
    );

    const res = await bridge.handleEventForAutomation(event);

    expect(res.handled).toBe(false);
    expect(runSpy).not.toHaveBeenCalled();
  });

  it("calls runtime with deterministic idempotencyKey if trigger exists", async () => {
    (registry.resolveTrigger as jest.Mock).mockReturnValue({
      eventType: "INVENTORY_UPDATED",
      buildContext: (event: any) => ({
        eventType: "INVENTORY_UPDATED",
        companyId: event.companyId,
        payload: event.payload,
      }),
    });

    const event = {
      type: InventoryEventType.STOCK_ADJUSTED,
      companyId: "c1",
      payload: { x: 1 },
    };

    const runSpy = jest.spyOn(
      runtime.AutomationRuntimeService,
      "beginRun"
    );

    const res = await bridge.handleEventForAutomation(event);

    expect(res.handled).toBe(true);
    expect(res.idempotencyKey).toMatch(/^auto_/);

    expect(runSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: event.type,
        idempotencyKey: res.idempotencyKey,
      })
    );
  });

  it("event router still calls other consumers even if automation throws", async () => {
    jest
      .spyOn(runtime.AutomationRuntimeService, "beginRun")
      .mockRejectedValueOnce(new Error("automation failed"));

    let called = false;

    // register non-automation consumer
    // @ts-expect-error test-only hook
    routeEvent.registerHandler("INVENTORY_UPDATED", async () => {
      called = true;
    });

    await expect(
      routeEvent({
         type: InventoryEventType.STOCK_ADJUSTED,
        companyId: "c1",
        payload: {},
      })
    ).resolves.not.toThrow();

    expect(called).toBe(true);
  });
});
