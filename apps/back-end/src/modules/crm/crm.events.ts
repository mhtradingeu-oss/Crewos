import { publish, type EventContext } from "../../core/events/event-bus.js";
import type { CrmLeadEventPayload, CrmLeadScoredEventPayload } from "./crm.types.js";

export enum CrmLeadEvents {
  CREATED = "crm.lead.created",
  UPDATED = "crm.lead.updated",
  DELETED = "crm.lead.deleted",
  SCORED = "crm.lead.scored",
}

export async function emitCrmLeadCreated(payload: CrmLeadEventPayload, context?: EventContext) {
  await publish(CrmLeadEvents.CREATED, payload, context);
}

export async function emitCrmLeadUpdated(payload: CrmLeadEventPayload, context?: EventContext) {
  await publish(CrmLeadEvents.UPDATED, payload, context);
}

export async function emitCrmLeadDeleted(payload: CrmLeadEventPayload, context?: EventContext) {
  await publish(CrmLeadEvents.DELETED, payload, context);
}

export async function emitCrmLeadScored(payload: CrmLeadScoredEventPayload, context?: EventContext) {
  await publish(CrmLeadEvents.SCORED, payload, context);
}
