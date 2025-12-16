// دالة metrics حسب ruleVersion (مطلوبة من explain.service)
export async function getRuleVersionMetrics({ ruleVersionId, brandId, from, to }: { ruleVersionId: string; brandId: string; from?: Date; to?: Date }): Promise<RuleVersionMetrics | null> {
	const runs = await prisma.automationRun.findMany({
		where: {
			ruleVersionId,
			...(brandId ? { ruleVersion: { rule: { brandId } } } : {}),
			...(from && to ? { createdAt: { gte: from, lte: to } } : {}),
		},
		select: {
			id: true,
			status: true,
			startedAt: true,
			finishedAt: true,
			actionRuns: {
				select: {
					id: true,
					status: true,
					startedAt: true,
					finishedAt: true,
					actionType: true,
					actionIndex: true,
					errorJson: true,
					resultJson: true,
				},
			},
		},
	});
	if (!runs.length) return null;
	const totalRuns = runs.length;
	const totalActionRuns = runs.reduce((sum, r) => sum + r.actionRuns.length, 0);
	const runSuccesses = runs.filter(r => r.status === "SUCCESS").length;
	const actionRuns = runs.flatMap(r => r.actionRuns);
	const actionSuccesses = actionRuns.filter(a => a.status === "SUCCESS").length;
	const runLatencies = runs.filter(r => r.startedAt && r.finishedAt).map(r => new Date(r.finishedAt!).getTime() - new Date(r.startedAt!).getTime());
	const actionLatencies = actionRuns.filter(a => a.startedAt && a.finishedAt).map(a => new Date(a.finishedAt!).getTime() - new Date(a.startedAt!).getTime());
	const latency = computeLatencyMetrics([...runLatencies, ...actionLatencies]);
	const failureCounts: Record<string, number> = {};
	for (const a of actionRuns) {
		if (a.status !== "SUCCESS") {
			let errorCode = undefined;
			let errorMessage = undefined;
			let runnerType = undefined;
			let gateResult = undefined;
			if (a.errorJson && isPlainObject(a.errorJson)) {
				const err = a.errorJson as Record<string, unknown>;
				errorCode = (err["code"] ?? err["errorCode"]) as string | undefined;
				errorMessage = (err["message"] ?? err["errorMessage"]) as string | undefined;
				runnerType = err["runnerType"] as string | undefined;
				gateResult = err["gateResult"] as string | undefined;
			}
			const cat = classifyFailure({ errorCode, errorMessage, runnerType, gateResult });
			failureCounts[cat] = (failureCounts[cat] || 0) + 1;
		}
	}
	return {
		ruleVersionId,
		totalRuns,
		totalActionRuns,
		runSuccessRate: computeSuccessRate(runSuccesses, totalRuns),
		actionSuccessRate: computeSuccessRate(actionSuccesses, totalActionRuns),
		latency,
		failureCounts,
	};
}
// Utility to check for plain object
function isPlainObject(val: unknown): val is Record<string, unknown> {
	return !!val && typeof val === "object" && !Array.isArray(val);
}
// Observability service for Automation OS (Phase 7.1)
// Strictly read-only. See system prompt for architectural constraints.


import { prisma } from "../../core/prisma.js";
import { computeLatencyMetrics, computeSuccessRate } from "../../core/observability/metrics.js";
import { classifyFailure } from "../../core/observability/failure-classifier.js";
import type {
	AutomationObservabilitySummary,
	RuleVersionMetrics,
	FailureBreakdown,
	TopRuleVersion,
	TopAction,
} from "./automation.observability.types.js";


export async function getSummary(params: { brandId: string; from: Date; to: Date }): Promise<AutomationObservabilitySummary> {
	const runs = await prisma.automationRun.findMany({
		where: {
			ruleVersion: {
				rule: {
					brandId: params.brandId,
				},
			},
			createdAt: { gte: params.from, lte: params.to },
		},
		select: {
			id: true,
			status: true,
			startedAt: true,
			finishedAt: true,
			actionRuns: {
				select: {
					id: true,
					status: true,
					startedAt: true,
					finishedAt: true,
					actionType: true,
					actionIndex: true,
					errorJson: true,
					resultJson: true,
				},
			},
		},
	});

	if (!runs.length) {
		return {
			brandId: params.brandId,
			timeRange: { from: params.from, to: params.to },
			totalRuns: 0,
			totalActionRuns: 0,
			runSuccessRate: 0,
			actionSuccessRate: 0,
			latency: { avg: 0, p50: 0, p95: 0 },
			failureCounts: {},
		};
	}

	const totalRuns = runs.length;
	const totalActionRuns = runs.reduce((sum, r) => sum + r.actionRuns.length, 0);
	const runSuccesses = runs.filter(r => r.status === "SUCCESS").length;
	const actionRuns = runs.flatMap(r => r.actionRuns);
	const actionSuccesses = actionRuns.filter(a => a.status === "SUCCESS").length;
	const runLatencies = runs
		.filter(r => r.startedAt && r.finishedAt)
		.map(r => new Date(r.finishedAt!).getTime() - new Date(r.startedAt!).getTime());
	const actionLatencies = actionRuns
		.filter(a => a.startedAt && a.finishedAt)
		.map(a => new Date(a.finishedAt!).getTime() - new Date(a.startedAt!).getTime());
	const latency = computeLatencyMetrics([...runLatencies, ...actionLatencies]);
	const failureCounts: Record<string, number> = {};
	for (const a of actionRuns) {
		if (a.status !== "SUCCESS") {
			let errorCode = undefined;
			let errorMessage = undefined;
			let runnerType = undefined;
			let gateResult = undefined;
			if (a.errorJson && isPlainObject(a.errorJson)) {
				const err = a.errorJson as Record<string, unknown>;
				errorCode = (err["code"] ?? err["errorCode"]) as string | undefined;
				errorMessage = (err["message"] ?? err["errorMessage"]) as string | undefined;
				runnerType = err["runnerType"] as string | undefined;
				gateResult = err["gateResult"] as string | undefined;
			}
			const cat = classifyFailure({
				errorCode,
				errorMessage,
				runnerType,
				gateResult,
			});
			failureCounts[cat] = (failureCounts[cat] || 0) + 1;
		}
	}
	return {
		brandId: params.brandId,
		timeRange: { from: params.from, to: params.to },
		totalRuns,
		totalActionRuns,
		runSuccessRate: computeSuccessRate(runSuccesses, totalRuns),
		actionSuccessRate: computeSuccessRate(actionSuccesses, totalActionRuns),
		latency,
		failureCounts,
	};
}

// (Removed duplicate and incomplete getRuleVersionMetrics definition.)
// The correct implementation should be defined elsewhere in this file, or you can move the inner function here if needed.

export async function getFailureBreakdown(params: { brandId: string; from: Date; to: Date; groupBy?: "category" | "actionRunner" | "errorCode" }): Promise<FailureBreakdown> {
	const runs = await prisma.automationRun.findMany({
		where: {
			ruleVersion: {
				rule: {
					brandId: params.brandId,
				},
			},
			createdAt: { gte: params.from, lte: params.to },
		},
		select: {
			actionRuns: {
				select: {
					status: true,
					actionType: true,
					actionIndex: true,
					errorJson: true,
				},
			},
		},
	});

	if (!runs.length) {
		return { byCategory: {}, byActionRunner: {}, byErrorCode: {} };
	}

	const actionRuns = runs.flatMap(r => r.actionRuns).filter(a => a.status !== "SUCCESS");
	const byCategory: Record<string, number> = {};
	const byActionRunner: Record<string, number> = {};
	const byErrorCode: Record<string, number> = {};
	for (const a of actionRuns) {
		let errorCode = undefined;
		let errorMessage = undefined;
		let runnerType = undefined;
		let gateResult = undefined;
		if (a.errorJson && isPlainObject(a.errorJson)) {
			const err = a.errorJson as Record<string, unknown>;
			errorCode = (err["code"] ?? err["errorCode"]) as string | undefined;
			errorMessage = (err["message"] ?? err["errorMessage"]) as string | undefined;
			runnerType = err["runnerType"] as string | undefined;
			gateResult = err["gateResult"] as string | undefined;
		}
		const cat = classifyFailure({
			errorCode,
			errorMessage,
			runnerType,
			gateResult,
		});
		byCategory[cat] = (byCategory[cat] || 0) + 1;
		if (runnerType) byActionRunner[runnerType] = (byActionRunner[runnerType] || 0) + 1;
		if (errorCode) byErrorCode[errorCode] = (byErrorCode[errorCode] || 0) + 1;
	}
	return { byCategory, byActionRunner, byErrorCode };
}

export async function getTop(params: { brandId: string; from: Date; to: Date; by: "failures" | "latency" | "volume"; limit: number }): Promise<{ ruleVersions: TopRuleVersion[]; actions: TopAction[] }> {
	const runs = await prisma.automationRun.findMany({
		where: {
			ruleVersion: {
				rule: {
					brandId: params.brandId,
				},
			},
			createdAt: { gte: params.from, lte: params.to },
		},
		select: {
			ruleVersionId: true,
			id: true,
			startedAt: true,
			finishedAt: true,
			status: true,
			actionRuns: {
				select: {
					id: true,
					actionType: true,
					actionIndex: true,
					status: true,
					startedAt: true,
					finishedAt: true,
				},
			},
		},
	});

	if (!runs.length) {
		return { ruleVersions: [], actions: [] };
	}

	// Aggregate by ruleVersion
	const ruleVersionMap = new Map<string, { failures: number; latency: number[]; volume: number }>();
	for (const r of runs) {
		if (!ruleVersionMap.has(r.ruleVersionId)) ruleVersionMap.set(r.ruleVersionId, { failures: 0, latency: [], volume: 0 });
		const entry = ruleVersionMap.get(r.ruleVersionId)!;
		entry.volume++;
		if (r.status !== "SUCCESS") entry.failures++;
		if (r.startedAt && r.finishedAt) entry.latency.push(new Date(r.finishedAt).getTime() - new Date(r.startedAt).getTime());
	}
	let ruleVersions: TopRuleVersion[] = Array.from(ruleVersionMap.entries()).map(([ruleVersionId, v]) => ({
		ruleVersionId,
		failures: v.failures,
		latency: v.latency.length ? v.latency.reduce((a, b) => a + b, 0) / v.latency.length : 0,
		volume: v.volume,
	}));
	// Aggregate by action (actionType + actionIndex as unique key)
	const actionMap = new Map<string, { failures: number; latency: number[]; volume: number }>();
	for (const r of runs) {
		for (const a of r.actionRuns) {
			const actionKey = `${a.actionType ?? "unknown"}#${a.actionIndex ?? 0}`;
			if (!actionMap.has(actionKey)) actionMap.set(actionKey, { failures: 0, latency: [], volume: 0 });
			const entry = actionMap.get(actionKey)!;
			entry.volume++;
			if (a.status !== "SUCCESS") entry.failures++;
			if (a.startedAt && a.finishedAt) entry.latency.push(new Date(a.finishedAt).getTime() - new Date(a.startedAt).getTime());
		}
	}
	let actions: TopAction[] = Array.from(actionMap.entries()).map(([actionId, v]) => ({
		actionId,
		failures: v.failures,
		latency: v.latency.length ? v.latency.reduce((a, b) => a + b, 0) / v.latency.length : 0,
		volume: v.volume,
	}));
	// Sort and limit
	const sortKey = params.by;
	ruleVersions = ruleVersions.sort((a, b) => b[sortKey] - a[sortKey]).slice(0, params.limit);
	actions = actions.sort((a, b) => b[sortKey] - a[sortKey]).slice(0, params.limit);
	return { ruleVersions, actions };
}
