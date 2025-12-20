// apps/back-end/src/modules/automation/automation.event.bridge.ts

import { resolveTrigger } from "./automation.trigger.registry.js";
import { AutomationRuntimeService } from "./automation.runtime.service.js";
import stableJson from "fast-json-stable-stringify";
import type { AutomationEventTrigger } from "@mh-os/shared";

/**
 * Canonical Event → Automation bridge
 * - NO Prisma
 * - NO engine logic
 * - Deterministic
 * - ESM-safe
 */
export async function handleEventForAutomation(event: {
  type: string;
  companyId?: string;
  idempotencyKey?: string;
  payload?: unknown;
  source?: string;
}): Promise<{ handled: boolean; idempotencyKey?: string }> {
  const trigger = resolveTrigger(event.type) as
    | AutomationEventTrigger<typeof event>
    | undefined;

  if (!trigger) {
    return { handled: false };
  }

  // Build canonical trigger context
  const context = trigger.buildContext(event);

  if (!context.companyId) {
    throw new Error("Automation trigger context missing companyId");
  }

  const idempotencyKey =
    event.idempotencyKey ??
    hashIdempotencyKey(trigger.eventType, context.companyId, context.payload);


  // Compose minimal plan for beginRun (required by signature)
  const plan = { actions: [] };
  // These would be resolved from rule/trigger in a real system
  const ruleId = "test-rule";
  const ruleVersionId = "v1";
  const registry = {};

  await AutomationRuntimeService.beginRun({
    eventType: trigger.eventType,
    idempotencyKey,
    plan,
    ruleId,
    ruleVersionId,
    context,
    registry
  });

  return { handled: true, idempotencyKey };
}

function hashIdempotencyKey(
  eventType: string,
  companyId: string,
  payload: unknown
): string {
  const base = `${eventType}:${companyId}:${stableJson(payload)}`;
  return hashString(base);
}

function hashString(str: string): string {
  // Deterministic non-crypto hash (FNV-1a style)
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash +=
      (hash << 1) +
      (hash << 4) +
      (hash << 7) +
      (hash << 8) +
      (hash << 24);
  }
  return `auto_${(hash >>> 0).toString(16)}`;
}
