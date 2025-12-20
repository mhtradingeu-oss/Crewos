import type { AutomationExplainRequest } from "./automation.explain.request.js";
import { AutomationRuntime } from "../../core/automation/runtime/automation-runtime.js";
import { assembleExplainResponse } from "@mh-os/shared";
import { buildPlan } from "../../core/automation/matcher/rule-matcher.js";
import type { AuthenticatedRequest } from "../../core/http/http-types.js";
import type { Request, Response, NextFunction } from "express";
import * as explainSnapshotService from "./automation.explain.service.js";

const missingCompanyIdPayload = {
	code: "missing_companyId",
	message: "Authenticated user context missing companyId (tenantId)",
};

const explainSnapshotNotFoundPayload = {
	code: "explain_snapshot_not_found",
	message: "Explain snapshot not found",
};

const resolveCompanyId = (req: AuthenticatedRequest, res: Response): string | null => {
	const companyId = req.user?.tenantId;
	if (!companyId) {
		res.status(400).json(missingCompanyIdPayload);
		return null;
	}
	return companyId;
};

const respondSnapshotNotFound = (res: Response) => res.status(404).json(explainSnapshotNotFoundPayload);

// POST /api/v1/automation/explain
export async function explainEvent(req: AuthenticatedRequest, res: Response, next: NextFunction) {
	try {
		const body = req.body as AutomationExplainRequest;
		// Source companyId from authenticated user context
		const companyId = req.user?.tenantId;
		if (!companyId) {
			return res.status(400).json({ code: "missing_companyId", message: "Authenticated user context missing companyId (tenantId)" });
		}
		// Build event for planner
		const event = {
			name: body.eventName,
			occurredAt: body.occurredAt || new Date().toISOString(),
			companyId, // ENFORCED
			tenantId: body.tenantId,
			brandId: body.brandId,
			correlationId: body.correlationId,
			payload: body.payload,
			...((body.meta && typeof body.meta === 'object') ? { meta: body.meta } : {}),
		};
		// Build plan (PLAN-ONLY)
		const planRaw = buildPlan(event);
		// Add required meta for AutomationPlan
		const plan: import("@mh-os/shared").AutomationPlan = {
			...planRaw,
			meta: {
				evaluatedAt: event.occurredAt,
				engine: 'json-logic',
				mode: 'PLAN_ONLY',
			},
		};
		// Run runtime (PLAN-ONLY)
		const runtime = new AutomationRuntime();
		const result = runtime.run(plan);
		// Assemble explain response
		const explainResponse = assembleExplainResponse({
			trace: result.explain!,
			audience: (body.audience as any) || "ADMIN",
			format: (body.format as any) || "RAW",
		});
		res.status(200).json(explainResponse);
	} catch (err) {
		next(err);
	}
}

// Automation Explainability Controller (Phase 7.2)
// Strictly read-only. See system prompt for architectural constraints.

export async function getExplainSnapshotByRunId(req: AuthenticatedRequest, res: Response, next: NextFunction) {
	try {
		const companyId = resolveCompanyId(req, res);
		if (!companyId) return;
		const { runId } = req.params as { runId: string };
		const snapshot = await explainSnapshotService.getExplainSnapshotByRunId({
			companyId,
			runId,
		});
		if (!snapshot) {
			return respondSnapshotNotFound(res);
		}
		res.json(snapshot);
	} catch (err) {
		next(err);
	}
}

export async function getExplainSnapshotsByRuleVersion(req: AuthenticatedRequest, res: Response, next: NextFunction) {
	try {
		const companyId = resolveCompanyId(req, res);
		if (!companyId) return;
		const { ruleVersionId } = req.params as { ruleVersionId: string };
		const snapshots = await explainSnapshotService.getExplainSnapshotsByRuleVersion({
			companyId,
			ruleVersionId,
		});
		if (snapshots.length === 0) {
			return respondSnapshotNotFound(res);
		}
		res.json(snapshots);
	} catch (err) {
		next(err);
	}
}

export async function explainRuleVersion(req: Request, res: Response, next: NextFunction) {
	res.status(501).json({ message: "Not implemented" });
}

export async function explainRun(req: Request, res: Response, next: NextFunction) {
	res.status(501).json({ message: "Not implemented" });
}

export async function explainActionRun(req: Request, res: Response, next: NextFunction) {
	res.status(501).json({ message: "Not implemented" });
}
