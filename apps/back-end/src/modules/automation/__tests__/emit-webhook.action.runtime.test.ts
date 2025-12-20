import { describe, it, expect, jest } from "@jest/globals";
import { createEmitWebhookAction } from "../actions/emit-webhook.action.js";

describe("emit_webhook action", () => {
  it("calls transport with mapped payload and returns success without mutating inputs", async () => {
    const send = jest.fn(async () => ({ status: 202 }));
    const transport = { send };
    const action = createEmitWebhookAction(transport);

    const payload = {
      url: "https://api.example.com/webhook",
      headers: { "Content-Type": "application/json" },
      body: { event: "update" },
      timeoutMs: 5000,
    };
    const context = {
      executionId: "exec-1",
      idempotencyKey: "idem-1",
      companyId: "company-1",
      source: "SYSTEM" as const,
    };
    const payloadCopy = JSON.parse(JSON.stringify(payload));
    const contextCopy = JSON.parse(JSON.stringify(context));

    const result = await action.execute(payload, context);

    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalled();
    expect(result.status).toBe("SUCCESS");
    expect(result.idempotencyKey).toBe("idem-1");
    expect(payload).toEqual(payloadCopy);
    expect(context).toEqual(contextCopy);
  });

  it("returns FAILED when the transport throws", async () => {
    const send = jest.fn(async () => {
      throw new Error("network down");
    });
    const transport = { send };
    const action = createEmitWebhookAction(transport);

    const payload = {
      url: "https://hooks.example.com/notify",
    };
    const context = {
      executionId: "exec-2",
      idempotencyKey: "idem-2",
      companyId: "company-2",
      source: "SYSTEM" as const,
    };

    const result = await action.execute(payload, context);

    expect(send).toHaveBeenCalledTimes(1);
    expect(result.status).toBe("FAILED");
    expect(result.error).toBe("network down");
    expect(result.idempotencyKey).toBe("idem-2");
  });
});
