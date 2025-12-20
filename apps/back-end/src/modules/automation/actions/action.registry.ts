import type { AutomationActionAdapter } from "@mh-os/shared";

const registry = new Map<string, AutomationActionAdapter>();

export function registerAction(adapter: AutomationActionAdapter): void {
  registry.set(adapter.key, adapter);
}

export function resolveAction(
  actionKey: string
): AutomationActionAdapter | undefined {
  return registry.get(actionKey);
}
