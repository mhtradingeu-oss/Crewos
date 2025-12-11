import { publish } from "../../core/events/event-bus.js";
import type { AutomationEventPayload } from "./automation.types.js";

export enum AutomationEvents {
  CREATED = "automation.created",
  UPDATED = "automation.updated",
  DELETED = "automation.deleted",
}

export async function emitAutomationCreated(payload: AutomationEventPayload) {
  await publish(AutomationEvents.CREATED, payload);
}
