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
  return {
    key: "update_crm",
    async execute(payload: { entity: "lead" | "contact" | "customer"; entityId: string; changes: Record<string, unknown>; idempotencyKey?: string }, context: import("@mh-os/shared").AutomationActionContext) {
      await crm.updateEntity({
        entity: payload.entity,
        entityId: payload.entityId,
        changes: payload.changes,
      });
      return {
        actionKey: "update_crm",
        status: "SUCCESS",
        idempotencyKey: payload.idempotencyKey ?? context.idempotencyKey,
      };
    }
  };
}


