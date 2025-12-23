import { logger } from "../../logger.js";
import type { ActionRunner, ActionType } from "./types.js";

const runners = new Map<ActionType, ActionRunner>();

export function registerRunner(runner: ActionRunner): void {
  if (runners.has(runner.type)) {
    logger.warn(`[automation][actions] runner for ${runner.type} already registered`);
    return;
  }
  runners.set(runner.type, runner);
}

export function getRunner(type: string): ActionRunner | undefined {
  return runners.get(type as ActionType);
}

export function listRunners(): ActionRunner[] {
  return Array.from(runners.values());
}
