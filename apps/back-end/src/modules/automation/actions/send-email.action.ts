import type {
  AutomationActionAdapter,
  AutomationActionContext,
  AutomationActionResult,
} from "@mh-os/shared";

import type { EmailTransport } from "./ports/email.transport.js";
import { registerAction } from "./action.registry.js";

/**
 * Factory to create the send_email automation action
 * - Pure adapter
 * - No IO except via injected transport
 * - No Prisma
 * - Deterministic
 */
export function createSendEmailAction(
  transport: EmailTransport
): AutomationActionAdapter<{
  to: string;
  subject: string;
  body: string;
}> {
  return {
    key: "send_email",

    async execute(
      payload,
      context: AutomationActionContext
    ): Promise<AutomationActionResult> {
      await transport.send({
        to: payload.to,
        subject: payload.subject,
        body: payload.body,
      });

      return {
        actionKey: "send_email",
        status: "SUCCESS",
        idempotencyKey: context.idempotencyKey,
      };
    },
  };
}

/**
 * Registration helper
 */
export function registerSendEmailAction(
  transport: EmailTransport
): void {
  registerAction(createSendEmailAction(transport));
}
