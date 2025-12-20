import { describe, it, expect, jest } from "@jest/globals";
import { createSendEmailAction } from "../actions/send-email.action.js";

describe("send_email action", () => {
  it("sends email using injected transport", async () => {
    const send = jest.fn(async () => {});
    const transport = { send };

    const action = createSendEmailAction(transport);

    const payload = {
      to: "user@test.com",
      subject: "Hello",
      body: "World",
    };
    const context = {
      executionId: "exec-1",
      idempotencyKey: "idem-1",
      companyId: "company-1",
      source: "SYSTEM" as const,
    };
    const result = await action.execute(payload, context);

    expect(send).toHaveBeenCalled();

    expect(result.status).toBe("SUCCESS");
  });
});
