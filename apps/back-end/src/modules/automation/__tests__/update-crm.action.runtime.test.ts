import { describe, it, expect, jest } from "@jest/globals";
import { createUpdateCrmAction } from "../actions/update-crm.action.js";

describe("update_crm action", () => {
  it("calls CRM client once and returns success, preserves idempotencyKey, does not mutate input", async () => {
    const updateEntity = jest.fn(async () => {});
    const crm = { updateEntity };
    const action = createUpdateCrmAction(crm);

    const payload = {
      entity: "lead" as const,
      entityId: "123",
      changes: { name: "Test Lead" },
      idempotencyKey: "idem-1",
    };
    const context = {
      executionId: "exec-1",
      idempotencyKey: "idem-1",
      companyId: "company-1",
      source: "SYSTEM" as const,
      metadata: { event: "lead_created" },
    };
    const payloadCopy = JSON.parse(JSON.stringify(payload));
    const contextCopy = JSON.parse(JSON.stringify(context));

    const result = await action.execute(payload, context);

    expect(updateEntity).toHaveBeenCalledTimes(1);
    expect(updateEntity).toHaveBeenCalled();
    expect(result.status).toBe("SUCCESS");
    expect(result.idempotencyKey).toMatch(/^idem-\d+$/);
    expect(payload).toEqual(payloadCopy);
    expect(context).toEqual(contextCopy);
  });
});
