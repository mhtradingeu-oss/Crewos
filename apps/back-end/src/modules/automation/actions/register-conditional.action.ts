import { createConditionalAction } from "./conditional.action.js";
import { registerAction } from "./action.registry.js";
import type { ActionExecutor } from "./conditional.action.js";

export function registerConditionalAction(executor: ActionExecutor) {
  registerAction(createConditionalAction(executor));
}
