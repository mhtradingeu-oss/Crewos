import { publish, type EventContext } from "../../core/events/event-bus.js";
import type {
  SalesActivityEventPayload,
  SalesPlanEventPayload,
  SalesRepsEventPayload,
} from "./sales-reps.types.js";

export enum SalesRepsEvents {
  CREATED = "sales-reps.created",
  UPDATED = "sales-reps.updated",
  DELETED = "sales-reps.deleted",
  PLAN_GENERATED = "sales.plan.generated",
  ACTIVITY_LOGGED = "sales.activity.logged",
}

export async function emitSalesRepsCreated(payload: SalesRepsEventPayload) {
  await publish(SalesRepsEvents.CREATED, payload);
}

export async function emitSalesPlanGenerated(
  payload: SalesPlanEventPayload,
  context?: EventContext,
) {
  await publish(SalesRepsEvents.PLAN_GENERATED, payload, context);
}

export async function emitSalesActivityLogged(
  payload: SalesActivityEventPayload,
  context?: EventContext,
) {
  await publish(SalesRepsEvents.ACTIVITY_LOGGED, payload, context);
}
