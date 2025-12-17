// =======================
// DTOs
// =======================

// Auth
export * from "./dto/auth/index.js";

// Users
export * from "./dto/users/index.js";

// Pricing
export * from "./dto/pricing.js";

// Finance
export * from "./dto/finance/index.js";

// Automation
export * from "./dto/automation.js";
export type { ConditionEvalResult } from "./dto/automation.js";

// Automation Planner (Phase C.2)
export * from "./dto/automation-plan.js";

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

