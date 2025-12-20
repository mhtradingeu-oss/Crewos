import { InventoryEventType } from "@mh-os/shared";

// Import the automation event bridge (ESM .js extension)
import { handleEventForAutomation } from "../../modules/automation/automation.event.bridge.js";

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

  // After normal consumers, call automation bridge (do not break delivery)
  try {
    await handleEventForAutomation(event);
  } catch (err) {
    // Do not throw, log if needed (here: silent for minimal change)
  }
}
