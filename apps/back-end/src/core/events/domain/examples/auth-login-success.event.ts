import type { DomainEventHandler } from "../types.js";
import { defineDomainEvent } from "../types.js";
import { domainEventBus } from "../bus.js";

export type AuthLoginSuccessPayload = {
  userId: string;
  email: string;
  tenantId?: string | null;
  role?: string;
};

export const AuthLoginSuccessDefinition = defineDomainEvent<
  "auth.login.success",
  AuthLoginSuccessPayload
>("auth.login.success");

export type AuthLoginSuccessEvent = ReturnType<typeof AuthLoginSuccessDefinition.create>;

export function emitAuthLoginSuccess(
  payload: AuthLoginSuccessPayload,
  meta?: Parameters<typeof AuthLoginSuccessDefinition.create>[1],
) {
  const event = AuthLoginSuccessDefinition.create(payload, meta);
  domainEventBus.emit(event);
  return event;
}

export function onAuthLoginSuccess(handler: DomainEventHandler<AuthLoginSuccessEvent>) {
  return domainEventBus.subscribe(AuthLoginSuccessDefinition, handler);
}
