import { registerAction } from "./action.registry.js";
import type { AutomationActionAdapter } from "@mh-os/shared";
import type { CrmClient } from "../ports/crm.port.js";

export function createUpdateCrmAction(
  crm: CrmClient
): AutomationActionAdapter<{
  entity: "lead" | "contact" | "customer";
  entityId: string;
  changes: Record<string, unknown>;
  idempotencyKey?: string;
}> {
  return async ({ payload, context }) => {
    await crm.updateEntity({
      entity: payload.entity,
      entityId: payload.entityId,
      changes: payload.changes,
    });
    return {
      status: "SUCCESS",
      idempotencyKey: payload.idempotencyKey,
    };
  };
}

export function registerUpdateCrmAction(crm: CrmClient) {
  registerAction(
    "update_crm",
    createUpdateCrmAction(crm)
  );
}
