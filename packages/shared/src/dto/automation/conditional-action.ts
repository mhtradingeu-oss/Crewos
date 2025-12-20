// ConditionalActionPayload and ConditionalPredicate DTOs for conditional automation actions
// PHASE 8.2.4

export type ConditionalPredicate =
  | { type: 'exists'; path: string }
  | { type: 'equals'; path: string; value: unknown }
  | { type: 'contains'; path: string; value: unknown };

export interface ConditionalActionPayload {
  predicate: ConditionalPredicate;
  thenActions: unknown[];
  elseActions?: unknown[];
}
