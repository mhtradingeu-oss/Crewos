import { describe, it, expect, jest } from "@jest/globals";
import { createSendEmailAction } from "../actions/send-email.action.js";

describe("send_email action", () => {
  it("sends email using injected transport", async () => {
    const send = jest.fn(async () => {});
    const transport = { send };

    const action = createSendEmailAction(transport);

    const result = await action({
      payload: {
        to: "user@test.com",
        subject: "Hello",
        body: "World",
      },
      context: {},
    });

    expect(send).toHaveBeenCalledWith({
      to: "user@test.com",
      subject: "Hello",
      body: "World",
    });

    expect(result.status).toBe("SUCCESS");
  });
});
