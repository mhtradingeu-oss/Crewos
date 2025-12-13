export type DomainEventMeta = {
  actorUserId?: string;
  brandId?: string;
  tenantId?: string;
  requestId?: string;
  source?: "api" | "system" | "ai" | string;
  module?: string;
  severity?: "info" | "warning" | "critical";
  [key: string]: unknown;
};

export type DomainEvent<TPayload = unknown, TMeta extends DomainEventMeta = DomainEventMeta> = {
  name: string;
  payload: TPayload;
  meta?: TMeta;
  occurredAt: Date;
};

export type DomainEventHandler<E extends DomainEvent = DomainEvent> = (event: E) => Promise<void> | void;

export type DomainEventDescriptor<
  Name extends string,
  Payload,
  Meta extends DomainEventMeta = DomainEventMeta,
> = {
  readonly name: Name;
  create(payload: Payload, meta?: Meta): DomainEvent<Payload, Meta> & { name: Name };
  match(event: DomainEvent): event is DomainEvent<Payload, Meta> & { name: Name };
};

export type DescriptorEvent<Desc extends DomainEventDescriptor<string, unknown>> = ReturnType<Desc["create"]>;

/** Helper used to describe domain events in a strongly-typed way. */
export function defineDomainEvent<
  Name extends string,
  Payload,
  Meta extends DomainEventMeta = DomainEventMeta,
>(name: Name): DomainEventDescriptor<Name, Payload, Meta> {
  return {
    name,
    create(payload: Payload, meta?: Meta) {
      return {
        name,
        payload,
        meta,
        occurredAt: new Date(),
      } as DomainEvent<Payload, Meta> & { name: Name };
    },
    match(event: DomainEvent): event is DomainEvent<Payload, Meta> & { name: Name } {
      return event.name === name;
    },
  };
}
