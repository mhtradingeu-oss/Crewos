import { describe, it, expect, jest } from "@jest/globals";
import { createUpdateCrmAction } from "../actions/update-crm.action.js";

describe("update_crm action", () => {
  it("calls CRM client once and returns success, preserves idempotencyKey, does not mutate input", async () => {
    const updateEntity = jest.fn(async () => {});
    const crm = { updateEntity };
    const action = createUpdateCrmAction(crm);

    const payload = {
      entity: "lead",
      entityId: "123",
      changes: { name: "Test Lead" },
      idempotencyKey: "idem-001",
    };
    const context = { event: "test", execution: { id: "exec-1" } };
    const payloadCopy = JSON.parse(JSON.stringify(payload));
    const contextCopy = JSON.parse(JSON.stringify(context));

    const result = await action({ payload, context });

    expect(updateEntity).toHaveBeenCalledTimes(1);
    expect(updateEntity).toHaveBeenCalledWith({
      entity: "lead",
      entityId: "123",
      changes: { name: "Test Lead" },
    });
    expect(result.status).toBe("SUCCESS");
    expect(result.idempotencyKey).toBe("idem-001");
    expect(payload).toEqual(payloadCopy);
    expect(context).toEqual(contextCopy);
  });
});
