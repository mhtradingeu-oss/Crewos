import type { SecurityEvent } from "../../security/security-events.js";

type SecurityPayloadMap = {
  [Event in SecurityEvent as Event["type"]]: Omit<Event, "type">;
};

export type DomainEventPayloadMap = SecurityPayloadMap;
export type DomainEventName = keyof DomainEventPayloadMap;

export interface DomainEventMeta {
  brandId?: string | null;
  tenantId?: string | null;
  actorUserId?: string | null;
  module?: string;
  source?: string;
  requestId?: string;
  [key: string]: unknown;
}

export interface DomainEvent<T extends DomainEventName = DomainEventName> {
  id: string;
  type: T;
  payload: DomainEventPayloadMap[T];
  meta?: DomainEventMeta;
  occurredAt: Date;
}

export type DomainEventHandler<T extends DomainEventName = DomainEventName> = (
  event: DomainEvent<T>,
) => Promise<void> | void;

export type DomainEventPublishPayload<T extends DomainEventName = DomainEventName> = {
  type: T;
  payload: DomainEventPayloadMap[T];
  meta?: DomainEventMeta;
};
