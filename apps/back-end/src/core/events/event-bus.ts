import { EventEmitter } from "events";
import { randomUUID } from "crypto";

export type EventContext = {
  actorUserId?: string;
  brandId?: string;
  tenantId?: string;
  role?: string;
  source?: "api" | "system" | "ai" | string;
  module?: string;
  severity?: "info" | "warning" | "critical";
  requestId?: string;
};

export type EventEnvelope<T = unknown> = {
  id: string;
  name: string;
  payload: T;
  context?: EventContext;
  occurredAt: Date;
};

export type EventHandler<T = unknown> = (event: EventEnvelope<T>) => Promise<void> | void;

const bus = new EventEmitter();
const ALL_EVENTS = "*";

export async function publish<T = unknown>(
  eventName: string,
  payload: T,
  context?: EventContext,
): Promise<void> {
  const module = context?.module ?? eventName.split(".")[0];
  const envelope: EventEnvelope<T> = {
    id: randomUUID(),
    name: eventName,
    payload,
    context: { ...context, module },
    occurredAt: new Date(),
  };

  bus.emit(eventName, envelope);
  bus.emit(ALL_EVENTS, envelope);
}

// Alias for compatibility with executor usage
export function emitEvent(event: string, payload: any, context?: EventContext) {
  return publish(event, payload, context);
}

export function subscribe<T = unknown>(
  eventName: string | typeof ALL_EVENTS,
  handler: EventHandler<T>,
): void {
  bus.on(eventName, (event: EventEnvelope<T>) => {
    void handler(event);
  });
}

export function subscribeToAll(handler: EventHandler): void {
  subscribe(ALL_EVENTS, handler);
}
