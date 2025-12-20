
import type { AutomationPlan } from "@mh-os/shared";
import type { AutomationRuntimeResult } from "./types.js";
import type {
  AutomationExplainTrace,
  RuleExplainEntry,
  AutomationDecisionSummary,
} from "@mh-os/shared";
import type {
  AutomationAuditEnvelope,
  AutomationAuditSink,
} from "@mh-os/shared";
import { NoopAutomationAuditSink } from "../audit/index.js";
import { DisabledExecutionGate } from "../gate/execution-gate.js";
import { PolicyEngine } from "../policy/policy-engine.js";
export class AutomationRuntime {
  /**
   * Phase C Runtime (aligned to canonical AutomationPlan only)
   * PLAN-ONLY — no execution, no side effects
   */
  run(plan: AutomationPlan): AutomationRuntimeResult {
    // Enforce companyId presence at runtime (compile-time enforced by type)
    const { companyId } = plan.event;
    if (!companyId) {
      throw new Error("companyId is required for Automation execution");
    }
    // Execution Gate (explainability only)
    const gate = new DisabledExecutionGate();
    const firstRule = plan.matchedRules[0];
    const executionGate = gate.decide({
      companyId,
      tenantId: plan.event.tenantId,
      brandId: plan.event.brandId,
      actorUserId: plan.event.actorUserId,
      eventName: plan.event.name,
      ruleId: firstRule?.ruleId || "",
      versionId: firstRule?.versionId || "",
      actionType: firstRule?.plannedActions[0]?.type,
    });

    // Policy Layer (explainability only)
    const defaultPolicyConfig = {
      enabled: false,
      allowlist: [],
      defaultDeny: true,
    };
    const policyDecision = PolicyEngine.evaluate({
      scope: {
        companyId,
        tenantId: plan.event.tenantId,
        brandId: plan.event.brandId,
        actorUserId: plan.event.actorUserId,
      },
      plan,
      config: defaultPolicyConfig,
    });

    // PLAN-ONLY explainability trace wiring
    // Helper: map plan.matchedRules to RuleExplainEntry[]
    const matchedRules: RuleExplainEntry[] = (plan.matchedRules || []).map((rule) => {
      // Map single condition to array, with level
      const conditions = [
        {
          kind: 'json-logic' as const,
          passed: rule.condition.passed,
          reason: rule.condition.reason,
          level: 'CONDITION' as import("@mh-os/shared").ExplainLevel,
        },
      ];

      // No per-rule policy in plan (design-only)
      const policy = undefined;

      // Actions (PLAN-ONLY), with level
      const actions = (rule.plannedActions || []).map((action) => ({
        type: action.type,
        mode: 'PLAN_ONLY' as const,
        planned: true,
        params: action.params,
        level: 'ACTION' as import("@mh-os/shared").ExplainLevel,
      }));

      // Decision summary for this rule (PLAN-ONLY, always allowed)
      const decision: AutomationDecisionSummary = {
        allowed: true,
        mode: "PLAN_ONLY",
        reasonCodes: [],
      };

      return {
        ruleId: rule.ruleId,
        versionId: rule.versionId,
        ruleName: rule.ruleName,
        priority: rule.priority,
        conditions,
        conditionPassed: rule.condition.passed,
        policy,
        actions,
        decision,
      };
    });

    // Final decision: PLAN-ONLY, always allowed
    const finalDecision: AutomationDecisionSummary = {
      allowed: true,
      mode: "PLAN_ONLY",
      reasonCodes: [],
    };

    // Compose explain trace (level: ACTION)
    const explain: AutomationExplainTrace = {
      traceId:
        plan.event.correlationId ||
        `${plan.event.tenantId}:${plan.event.name}:${plan.meta.evaluatedAt}`,
      occurredAt: plan.meta.evaluatedAt,
      tenantId: plan.event.tenantId,
      brandId: plan.event.brandId,
      eventName: plan.event.name,
      matchedRules,
      finalDecision,
      level: 'ACTION' as import("@mh-os/shared").ExplainLevel,
    };

    // Audit sink (PLAN-ONLY, design-only, no side effects)
    const auditId = plan.event.correlationId || plan.event.name || "audit-fallback";
    const envelope: AutomationAuditEnvelope = {
      record: {
        auditId,
        occurredAt: plan.event.occurredAt,
        tenantId: plan.event.tenantId,
        brandId: plan.event.brandId,
        correlationId: plan.event.correlationId,
        kind: "PLAN_TRACE",
        level: "RUN",
        trace: explain,
      },
      schemaVersion: 1,
    };
    const sink = new NoopAutomationAuditSink();
    // Await the NOOP sink (no side effects)
    void sink.capture(envelope);

    return {
      plan,
      executionGate,
      policyDecision,
      explain,
      audit: { auditId, kind: "PLAN_TRACE", captured: true },
    };
  }
}
