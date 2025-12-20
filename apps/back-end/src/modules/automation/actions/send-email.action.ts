import { registerAction } from "./action.registry.js";
import type { AutomationActionAdapter } from "@mh-os/shared";
import type { EmailTransport } from "./ports/email.transport.js";

export function createSendEmailAction(
  transport: EmailTransport
): AutomationActionAdapter<{
  to: string;
  subject: string;
  body: string;
}> {
  return async ({ payload }) => {
    await transport.send({
      to: payload.to,
      subject: payload.subject,
      body: payload.body,
    });

    return {
      status: "SUCCESS",
    };
  };
}

export function registerSendEmailAction(
  transport: EmailTransport
) {
  registerAction(
    "send_email",
    createSendEmailAction(transport)
  );
}
