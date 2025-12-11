import { publish } from "../../core/events/event-bus.js";
import type { PartnersEventPayload } from "./partners.types.js";

export enum PartnersEvents {
  CREATED = "partners.created",
  UPDATED = "partners.updated",
  DELETED = "partners.deleted",
}

export async function emitPartnersCreated(payload: PartnersEventPayload) {
  await publish(PartnersEvents.CREATED, payload);
}

export async function emitPartnersUpdated(payload: PartnersEventPayload) {
  await publish(PartnersEvents.UPDATED, payload);
}

export async function emitPartnersDeleted(payload: PartnersEventPayload) {
  await publish(PartnersEvents.DELETED, payload);
}
