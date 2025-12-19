import { InventoryEventType } from "@mh-os/shared";

type EventHandler<T> = (event: T) => Promise<void>;

const handlers: Record<string, EventHandler<any>[]> = {};

export function registerHandler<T>(
  eventType: InventoryEventType,
  handler: EventHandler<T>
) {
  handlers[eventType] ??= [];
  handlers[eventType].push(handler);
}

export async function routeEvent(event: {
  type: InventoryEventType;
}) {
  const list = handlers[event.type] ?? [];
  for (const handler of list) {
    try {
      await handler(event);
    } catch {
      // isolation: swallow error, do not throw
    }
  }
}
