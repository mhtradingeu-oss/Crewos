import { registerAction } from "./action.registry.js";
import type { AutomationActionAdapter } from "@mh-os/shared";
import type { WebhookTransport } from "../ports/webhook.transport.js";

interface EmitWebhookPayload {
  readonly url: string;
  readonly method?: "POST" | "PUT" | "PATCH";
  readonly headers?: Record<string, string>;
  readonly body?: unknown;
  readonly timeoutMs?: number;
}

const formatErrorMessage = (value: unknown): string => {
  if (value instanceof Error) {
    return value.message;
  }
  if (typeof value === "string") {
    return value;
  }
  return "Unknown automation action error";
};

export function createEmitWebhookAction(
  transport: WebhookTransport
): AutomationActionAdapter<EmitWebhookPayload> {
  return async ({ payload, context }) => {
    if (typeof payload.url !== "string" || payload.url.trim() === "") {
      return {
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
        status: "SUCCESS",
        idempotencyKey: context.idempotencyKey,
      };
    } catch (error) {
      return {
        status: "FAILED",
        error: formatErrorMessage(error),
        idempotencyKey: context.idempotencyKey,
      };
    }
  };
}

export function registerEmitWebhookAction(transport: WebhookTransport) {
  registerAction(
    "emit_webhook",
    createEmitWebhookAction(transport)
  );
}
