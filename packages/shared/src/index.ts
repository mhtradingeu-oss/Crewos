export * from './dto/inventory-events.js';
// Automation Observability Binding (Phase C.6 Step 4)
export * from "./dto/automation-observability-binding.js";
// Automation Observability Projection & Aggregation (Phase C.6 Step 3)
export * from "./dto/automation-observability-projection.js";
// Automation Observability Collection Model (Phase C.6 Step 2)
export * from "./dto/automation-observability-collection.js";
// Automation Observability (Phase C.6 Step 1)
export * from "./dto/automation-observability.js";
// Explainability Snapshot (Phase C.5 Step 2)
export * from "./dto/automation-explain-snapshot.js";
// Explainability Response Assembly (C.4 Step 4)
export * from "./dto/automation-explain-assembly.js";
// Explainability Policy & Redaction (C.4 Step 3)
export * from "./dto/automation-explain-policy.js";
// Explainability Projection Layer (C.4 Step 2)
export * from "./dto/automation-explain-projection.js";
// Explainability Consumer Contracts (C.4 Step 1)
export * from "./dto/automation-explain-consumer.js";
// Automation Audit Sink (Phase C.3 Step 3)
export * from "./dto/automation-audit.js";
export type {
  AutomationAuditActionFailedPayload,
  AutomationAuditActionStartPayload,
  AutomationAuditActionSuccessPayload,
  AutomationAuditRunEndPayload,
  AutomationAuditRunStartPayload,
} from "./dto/automation-audit.js";
// =======================
// DTOs
// =======================

// Auth
export * from "./dto/auth/index.js";

// Users
export * from "./dto/users/index.js";

// Pricing
export * from "./dto/pricing.js";
// Automation Event Trigger (Unified Contract)
export * from "./dto/automation/automation-event-trigger.js";

// Inventory
export * from "./dto/inventory.js";
export * from "./dto/inventory-events.js";

// Finance
export * from "./dto/finance/index.js";

// Automation
export * from "./dto/automation.js";
export type {
  AutomationActionExecutionSummary,
  AutomationExecutionResult,
  ConditionEvalResult,
} from "./dto/automation.js";

// Automation Explainability (Phase C.3)
export * from "./dto/automation-explain.js";
export type {
  AutomationExplainSnapshot,
  AutomationExplainAction,
  AutomationExplainConditionResult,
  AutomationExplainSnapshotEvent,
  AutomationExplainSnapshotStatus,
} from "./dto/automation-explain.js";

// Automation Planner (Phase C.2)
export * from "./dto/automation-plan.js";

// Automation Execution Gate (Phase C.2 Step 3)
export * from "./dto/automation-execution-gate.js";

// Automation Policy Layer (Phase C.2 Step 4)
export * from "./dto/automation-policy.js";

// AI
export * from "./dto/ai-base.js";
export * from "./dto/ai-brain/index.js";
export type { SalesKpiSummary } from "./dto/ai-brain/sales-kpi-summary.js";

// Responses
export * from "./responses/index.js";
export type { AuthSessionResponse, PlanFeatures, PlanTier } from "./responses/auth.response.js";

// Auth constants / plans
export * from "./auth/constants.js";

// =======================
// Schemas
// =======================

export * from "./dto/auth/login.schema.js";
export * from "./dto/auth/register.schema.js";
export * from "./dto/auth/forgot-password.schema.js";

export * from "./dto/users/create-user.schema.js";
export * from "./dto/users/update-user.schema.js";
export * from "./dto/users/list-users.schema.js";

// =======================
// Constants
// =======================
