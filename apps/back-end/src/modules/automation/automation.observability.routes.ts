// Observability routes for Automation OS (Phase 7.1)
// Strictly read-only. See system prompt for architectural constraints.

import { Router } from "express";
import { requireRole } from "../../core/security/auth-middleware.js";
import * as controller from "./automation.observability.controller.js";

const observabilityRouter = Router();

// GET /api/v1/automation/observability
observabilityRouter.get("/", requireRole("ADMIN", "SUPER_ADMIN", "SYSTEM"), controller.getMetricsSnapshot);

// GET /summary
observabilityRouter.get("/summary", controller.getSummary);

// GET /rule-versions/:ruleVersionId
observabilityRouter.get("/rule-versions/:ruleVersionId", controller.getRuleVersionMetrics);

// GET /failures
observabilityRouter.get("/failures", controller.getFailureBreakdown);

// GET /top
observabilityRouter.get("/top", controller.getTop);

export { observabilityRouter };
