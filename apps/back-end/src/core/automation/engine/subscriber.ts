import { logger } from "../../logger.js";
import { subscribeToAllDomainEvents } from "../../events/domain/bus.js";
import { runAutomationEngine } from "./engine.js";

let registered = false;

export function registerAutomationEngineSubscriber() {
  if (registered) return;
  subscribeToAllDomainEvents(async (event) => {
    try {
      await runAutomationEngine(event);
    } catch (err) {
      logger.error(`[automation][engine] failed to process event ${event.type}`, err);
    }
  });
  registered = true;
}
