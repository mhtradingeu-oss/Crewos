import { domainEventBus } from "../../events/domain/bus.js";
import { automationEngine } from "./engine.js";

let registered = false;

export function registerAutomationEngineSubscriber() {
  if (registered) return;

  domainEventBus.subscribeToAll(async (event) => {
    try {
      const results = await automationEngine.run(event);
      if (results.length) {
        console.debug(
          `[automation-engine] event ${event.name} processed ${results.length} runs`,
          results,
        );
      }
    } catch (error) {
      console.error("[automation-engine] failed to process event", event.name, error);
    }
  });

  registered = true;
}
