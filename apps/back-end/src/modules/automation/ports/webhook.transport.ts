export interface WebhookTransport {
  send(input: {
    url: string;
    method?: "POST" | "PUT" | "PATCH";
    headers?: Record<string, string>;
    body?: unknown;
    idempotencyKey: string;
    timeoutMs?: number;
  }): Promise<{ status: number; responseBody?: unknown }>;
}
