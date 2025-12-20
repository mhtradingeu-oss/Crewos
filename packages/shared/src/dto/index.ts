
// Domain DTO barrels
export * from "./onboarding/index.js";
export * from "./onboarding/extra.js";
export * from "./users/index.js";
export * from "./competitor/index.js";
export * from "./crm/index.js";
export * from "./ai-brain/index.js";
export * from "./ai-brain/virtual-office.js";
export * from "./operations/index.js";

// Automation Conditional Action DTOs
export * from "./automation/conditional-action.js";

// Explicit re-exports for conditional action types
export type {
	ConditionalActionPayload,
	ConditionalPredicate,
} from "./automation/conditional-action.js";

// Explicit re-exports for action types (for consumers)
export type {
	AutomationActionAdapter,
	AutomationActionContext,
	AutomationActionResult,
} from "./automation/automation-action.js";
