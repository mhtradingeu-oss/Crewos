import { z } from "zod";
import type { PolicyViolation, AutomationGateError } from "./automation.types.js";

/**
 * Minimal shared types (keep your project's real types if already defined elsewhere)
 */
type RuleState = "DRAFT" | "REVIEW" | "ACTIVE" | "PAUSED" | "DISABLED";
type PolicyStatus = "ok" | "blocked" | "review_required";

type ConditionOp = "eq" | "neq" | "gt" | "lt" | "includes";
type ConditionConfig = { path: string; op: ConditionOp; value?: unknown };

type ActionType =
  | "notification"
  | "log"
  | "crm.createTask"
  | "inventory.createRefillRequest"
  | "pricing.flagDraftForApproval";

type ActionConfig = { type: ActionType; params?: Record<string, unknown> };
type ActionExecutionResult = { action: string; details?: Record<string, unknown> };

type EventContext = { brandId?: string; actorUserId?: string; module?: string; source?: string };
type EventEnvelope = { name: string; payload?: unknown; context?: Record<string, unknown> };

type AutomationRuleRecord = {
  id: string;
  brandId?: string;
};

type PricingActionContext = { brandId?: string; actorUserId?: string };



/**
 * Zod schemas for safe validation
 */
const actionSchema = z.object({
  type: z.enum([
    "notification",
    "log",
    "crm.createTask",
    "inventory.createRefillRequest",
    "pricing.flagDraftForApproval",
  ]),
  params: z.record(z.unknown()).optional(),
});

const actionsWrapperSchema = z.object({
  actions: z.array(actionSchema).min(1, "At least one action is required"),
});

const conditionSchema = z.object({
  path: z.string().min(1),
  op: z.enum(["eq", "neq", "gt", "lt", "includes"]),
  value: z.unknown().optional(),
});

const conditionsWrapperSchema = z
  .object({
    all: z.array(conditionSchema).optional(),
    any: z.array(conditionSchema).optional(),
  })
  .refine((v) => (v.all?.length ?? 0) + (v.any?.length ?? 0) > 0, {
    message: "At least one condition is required (all/any).",
  });



/**
 * ✅ Service class owns db + external dependencies
 * (wire your real deps here)
 */

export class AutomationService {
  constructor(
    private readonly db: any,
    private readonly deps: {
      notificationService: any;
      pricingService: any;
      publish: (...args: any[]) => Promise<void>;
      publishActivity: (...args: any[]) => Promise<void>;
      badRequest: (m: string) => Error;
      notFound: (m: string) => Error;
      ruleVersionSelect: unknown;
      ruleSelect: unknown;
      ruleVersionSelectUnsafe?: unknown;
    },
  ) {}

  // --- Controller-facing stub methods ---
  public async list(_args: any) {
    throw new Error('Not implemented: list');
  }

  public async getById(_id: string) {
    throw new Error('Not implemented: getById');
  }

  public async create(_data: any) {
    throw new Error('Not implemented: create');
  }

  public async update(_id: string, _data: any) {
    throw new Error('Not implemented: update');
  }

  public async remove(_id: string) {
    throw new Error('Not implemented: remove');
  }

  public async runScheduled(_date: Date) {
    throw new Error('Not implemented: runScheduled');
  }

  public async runRule(_id: string, _context: any) {
    throw new Error('Not implemented: runRule');
  }

  public async handleEvent(_event: any) {
    throw new Error('Not implemented: handleEvent');
  }

  // --- Formerly standalone: gateError ---
  private gateError(code: AutomationGateError["code"], message: string): AutomationGateError {
    return { code, message };
  }

  // --- Formerly AutomationGates.policyGatePreSave ---
  public policyGatePreSave(input: {
    actionsConfigJson: unknown;
    triggerEvent: string;
    userRole?: string;
    permissions?: string[];
  }): PolicyViolation[] {
    const { actionsConfigJson, triggerEvent, permissions = [] } = input;
    const violations: PolicyViolation[] = [];

    if (!triggerEvent || triggerEvent.trim().length < 3) {
      violations.push({
        code: "automation.trigger.invalid",
        message: "triggerEvent is required and must be meaningful."
      });
      return violations;
    }

    const parsed = actionsWrapperSchema.safeParse(actionsConfigJson);
    if (!parsed.success) {
      violations.push({
        code: "automation.actions.invalid",
        message: parsed.error.issues.map((i) => i.message).join("; ")
      });
      return violations;
    }

    const requiredPermissionByAction: Record<ActionType, string> = {
      notification: "automation:action:notification",
      log: "automation:action:log",
      "crm.createTask": "automation:action:crm_task",
      "inventory.createRefillRequest": "automation:action:inventory_refill",
      "pricing.flagDraftForApproval": "automation:action:pricing_flag",
    };

    for (const a of parsed.data.actions) {
      const needed = requiredPermissionByAction[a.type];
      if (needed && !permissions.includes(needed)) {
        violations.push({
          code: "automation.permission.missing",
          message: `Missing permission '${needed}' required for action '${a.type}'.`,
          metadata: { actionType: a.type, permission: needed },
        } as any);
      }
    }

    if (
      parsed.data.actions.some((a) => a.type === "pricing.flagDraftForApproval") &&
      !permissions.includes("pricing:drafts:submit")
    ) {
      violations.push({
        code: "automation.pricing.guardrail",
        message: "Pricing draft actions require 'pricing:drafts:submit'."
      });
    }

    return violations;
  }

  // --- Formerly AutomationGates.activationGatePreActivate ---
  public activationGatePreActivate(input: {
    ruleVersion: unknown;
    policyStatus: PolicyStatus;
    permissions: string[];
  }): PolicyViolation[] {
    const { ruleVersion, policyStatus, permissions } = input;
    const violations: PolicyViolation[] = [];

    if (policyStatus === "blocked") {
      violations.push({
        code: "automation.policy.blocked",
        message: "Policy status is blocked. Activation denied."
      });
      return violations;
    }

    if (!permissions.includes("automation:rules:activate")) {
      violations.push({
        code: "automation.permission.missing",
        message: "Missing permission 'automation:rules:activate'."
      });
      return violations;
    }

    const versionSchema = z.object({
      state: z.enum(["DRAFT", "REVIEW", "ACTIVE", "PAUSED", "DISABLED"]),
      triggerEvent: z.string().optional(),
      actionsConfigJson: z.unknown().optional(),
      conditionConfigJson: z.unknown().optional(),
    });

    const parsed = versionSchema.safeParse(ruleVersion);
    if (!parsed.success) {
      violations.push({
        code: "automation.rule_version.invalid",
        message: parsed.error.issues.map((i) => i.message).join("; ")
      });
      return violations;
    }

    if (parsed.data.actionsConfigJson !== undefined) {
      const actionsOk = actionsWrapperSchema.safeParse(parsed.data.actionsConfigJson);
      if (!actionsOk.success) {
        violations.push({
          code: "automation.actions.invalid",
          message: actionsOk.error.issues.map((i) => i.message).join("; ")
        });
      }
    }

    if (parsed.data.conditionConfigJson !== undefined) {
      const condOk = conditionsWrapperSchema.safeParse(parsed.data.conditionConfigJson);
      if (!condOk.success) {
        violations.push({
          code: "automation.conditions.invalid",
          message: condOk.error.issues.map((i) => i.message).join("; ")
        });
      }
    }

    return violations;
  }

  // --- Formerly AutomationGates.toGateError ---
  public toGateError(violations: PolicyViolation[]): AutomationGateError | null {
    // If any violation exists, treat as error for gate error
    if (!violations.length) return null;
    return this.gateError(
      "AUTOMATION_GATE_BLOCKED",
      violations.map((v) => v.message).join(" | "),
    );
  }


  public async editRuleVersion(
    ruleId: string,
    input: {
      triggerEvent: string;
      conditionConfigJson: unknown;
      actionsConfigJson: unknown;
      metaSnapshotJson?: unknown;
      createdById?: string;
    },
  ) {
    const latest = await this.db.automationRuleVersion.findFirst({
      where: { ruleId },
      orderBy: { versionNumber: "desc" },
      select: this.deps.ruleVersionSelect,
    });

    if (!latest) throw this.deps.notFound("No version found for rule");

    if (["ACTIVE", "PAUSED"].includes(String(latest.state))) {
      return this.createRuleVersion({
        ruleId,
        triggerEvent: input.triggerEvent,
        conditionConfigJson: input.conditionConfigJson,
        actionsConfigJson: input.actionsConfigJson,
        metaSnapshotJson: input.metaSnapshotJson,
        createdById: input.createdById,
      });
    }

    return this.updateRuleVersion(latest.id, input);
  }


  private async createRuleVersion(_data: any) {
    return this.db.automationRuleVersion.create({ data: _data });
  }

  private async updateRuleVersion(ruleVersionId: string, input: any) {
    return this.db.automationRuleVersion.update({
      where: { id: ruleVersionId },
      data: input,
    });
  }

  // ------------------ Keep your existing methods below ------------------
  // recordRunDetails / evaluateConditions / runActions / createCrmTask / createRefillRequest / flagPricingDraft ...
  // Add new methods here as needed, but keep all logic inside this class.
}

// --- Singleton export (must be last) ---
import { prisma } from '../../core/prisma.js';
// import { notificationService } from '../notification/notification.service.js';
// import { pricingService } from '../pricing/pricing.service.js';
import { publish } from '../../core/events/event-bus.js';
import { publishActivity } from '../../core/activity/activity.js';
import { badRequest, notFound } from '../../core/http/errors.js';

export const automationService = new AutomationService(prisma, {
  notificationService: {}, // TODO: wire real service
  pricingService: {}, // TODO: wire real service
  publish,
  publishActivity,
  badRequest,
  notFound,
  ruleVersionSelect: {}, // TODO: fill with actual select shape
  ruleSelect: {}, // TODO: fill with actual select shape
});
