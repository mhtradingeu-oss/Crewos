import { EventEmitter } from "events";
import type {
  DomainEvent,
  DomainEventDescriptor,
  DomainEventHandler,
  DescriptorEvent,
} from "./types.js";

const ALL_EVENTS = "*";

/**
 * Lightweight, in-process event bus that keeps handlers typed to their events.
 * Handlers should treat emitted events as facts and avoid side effects like direct DB writes.
 */
export class DomainEventBus {
  private readonly emitter = new EventEmitter();

  emit<E extends DomainEvent>(event: E): void {
    this.emitter.emit(event.name, event);
    this.emitter.emit(ALL_EVENTS, event);
  }

  subscribe<Desc extends DomainEventDescriptor<string, unknown>>(
    descriptor: Desc,
    handler: DomainEventHandler<DescriptorEvent<Desc>>,
  ): () => void;
  subscribe<Name extends string>(
    eventName: Name,
    handler: DomainEventHandler<DomainEvent & { name: Name }>,
  ): () => void;
  subscribe(
    eventNameOrDescriptor: string | DomainEventDescriptor<string, unknown>,
    handler: DomainEventHandler,
  ): () => void {
    const eventName =
      typeof eventNameOrDescriptor === "string" ? eventNameOrDescriptor : eventNameOrDescriptor.name;

    const listener = (event: DomainEvent) => {
      if (
        typeof eventNameOrDescriptor !== "string" &&
        !eventNameOrDescriptor.match(event)
      ) {
        return;
      }
      void handler(event as DomainEvent);
    };

    this.emitter.on(eventName, listener);
    return () => {
      this.emitter.off(eventName, listener);
    };
  }

  subscribeToAll(handler: DomainEventHandler): () => void {
    this.emitter.on(ALL_EVENTS, handler);
    return () => {
      this.emitter.off(ALL_EVENTS, handler);
    };
  }
}

export const domainEventBus = new DomainEventBus();
