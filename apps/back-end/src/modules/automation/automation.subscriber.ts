import { subscribeToAll } from "../../core/events/event-bus.js";
import { automationService } from "./automation.service.js";

let registered = false;

export function registerAutomationEventHandlers() {
  if (registered) return;
  subscribeToAll(async (event) => {
    try {
      await automationService.handleEvent(event);
    } catch (err) {
      console.error("[automation] failed to handle event", event.name, err);
    }
  });
  registered = true;
}
