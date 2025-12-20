import { registerAction } from "./action.registry.js";
import type { AutomationActionAdapter } from "@mh-os/shared";
import type { WebhookTransport } from "../ports/webhook.transport.js";

export interface EmitWebhookPayload {
  readonly url: string;
  readonly method?: "POST" | "PUT" | "PATCH";
  readonly headers?: Record<string, string>;
  readonly body?: unknown;
  readonly timeoutMs?: number;
}

function formatErrorMessage(value: unknown): string {
  if (value instanceof Error) return value.message;
  if (typeof value === "string") return value;
  return "Unknown automation action error";
}

export function createEmitWebhookAction(
  transport: WebhookTransport
): AutomationActionAdapter<EmitWebhookPayload> {
  return {
    key: "emit_webhook",
    async execute(payload: EmitWebhookPayload, context: import("@mh-os/shared").AutomationActionContext) {
      if (typeof payload.url !== "string" || payload.url.trim() === "") {
        return {
          actionKey: "emit_webhook",
          status: "FAILED",
          error: "emit_webhook action requires a valid url",
          idempotencyKey: context.idempotencyKey,
        };
      }
      const request = {
        url: payload.url,
        method: payload.method ?? "POST",
        headers: payload.headers,
        body: payload.body,
        timeoutMs: payload.timeoutMs,
        idempotencyKey: context.idempotencyKey,
      };
      try {
        await transport.send(request);
        return {
          actionKey: "emit_webhook",
          status: "SUCCESS",
          idempotencyKey: context.idempotencyKey,
        };
      } catch (error) {
        return {
          actionKey: "emit_webhook",
          status: "FAILED",
          error: formatErrorMessage(error),
          idempotencyKey: context.idempotencyKey,
        };
      }
    }
  };
}


