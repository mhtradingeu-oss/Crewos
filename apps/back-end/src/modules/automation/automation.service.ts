
/**
 * AUTOMATION SERVICE — MH-OS v2
 * Spec: docs/os/23_automation-os.md (MASTER_INDEX)
 */
import type { Prisma } from "@prisma/client";
import { prisma } from "../../core/prisma.js";
import { badRequest, notFound } from "../../core/http/errors.js";
import { buildPagination } from "../../core/utils/pagination.js";
import type { EventEnvelope } from "../../core/events/event-bus.js";
import { publish } from "../../core/events/event-bus.js";
import { notificationService } from "../notification/notification.service.js";
import { pricingService, type PricingActionContext } from "../pricing/pricing.service.js";
import type {
  ActionConfig,
  ConditionConfig,
  CreateAutomationInput,
  UpdateAutomationInput,
  AutomationRuleRecord,
} from "./automation.types.js";

type ActionExecutionResult = {
  action: string;
  details?: Record<string, unknown>;
};

const ruleSelect = {
  id: true,
  brandId: true,
  name: true,
  description: true,
  triggerType: true,
  triggerEvent: true,
  triggerConfigJson: true,
  conditionConfigJson: true,
  actionsConfigJson: true,
  enabled: true,
  createdAt: true,
  updatedAt: true,
  lastRunAt: true,
  lastRunStatus: true,
} satisfies Prisma.AutomationRuleSelect;

class AutomationService {
  constructor(private readonly db = prisma) {}

  async list(params: { brandId?: string; page?: number; pageSize?: number } = {}) {
    const { brandId, page = 1, pageSize = 20 } = params;
    const { skip, take } = buildPagination({ page, pageSize });
    const where: Prisma.AutomationRuleWhereInput = {};
    if (brandId) where.brandId = brandId;

    const [total, items] = await this.db.$transaction([
      this.db.automationRule.count({ where }),
      this.db.automationRule.findMany({
        where,
        select: ruleSelect,
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
    ]);

    return {
      items: items.map((item) => this.mapRule(item)),
      total,
      page,
      pageSize: take,
    };
  }

  async getById(id: string): Promise<AutomationRuleRecord> {
    const rule = await this.db.automationRule.findUnique({ where: { id }, select: ruleSelect });
    if (!rule) throw notFound("Automation rule not found");
    return this.mapRule(rule);
  }

  async create(input: CreateAutomationInput): Promise<AutomationRuleRecord> {
    const created = await this.db.automationRule.create({
      data: {
        brandId: input.brandId ?? null,
        name: input.name,
        description: input.description ?? null,
        triggerType: input.triggerType,
        triggerEvent: input.triggerEvent ?? null,
        triggerConfigJson: input.triggerConfig ? JSON.stringify(input.triggerConfig) : null,
        conditionConfigJson: input.conditionConfig ? JSON.stringify(input.conditionConfig) : null,
        actionsConfigJson: input.actions ? JSON.stringify({ actions: input.actions }) : null,
        enabled: input.isActive ?? true,
        createdById: input.createdById ?? null,
      },
      select: ruleSelect,
    });
    return this.mapRule(created);
  }

  async update(id: string, input: UpdateAutomationInput): Promise<AutomationRuleRecord> {
    const existing = await this.db.automationRule.findUnique({ where: { id }, select: ruleSelect });
    if (!existing) throw notFound("Automation rule not found");

    const updated = await this.db.automationRule.update({
      where: { id },
      data: {
        name: input.name ?? existing.name,
        description: input.description ?? existing.description,
        brandId: input.brandId ?? existing.brandId,
        triggerType: input.triggerType ?? (existing.triggerType as "event" | "schedule"),
        triggerEvent: input.triggerEvent ?? existing.triggerEvent,
        triggerConfigJson: input.triggerConfig
          ? JSON.stringify(input.triggerConfig)
          : existing.triggerConfigJson,
        conditionConfigJson: input.conditionConfig
          ? JSON.stringify(input.conditionConfig)
          : existing.conditionConfigJson,
        actionsConfigJson: input.actions
          ? JSON.stringify({ actions: input.actions })
          : existing.actionsConfigJson,
        enabled: input.isActive ?? existing.enabled,
        updatedById: input.createdById ?? null,
      },
      select: ruleSelect,
    });
    return this.mapRule(updated);
  }

  async remove(id: string) {
    await this.db.automationRule.delete({ where: { id } });
    return { id };
  }

  async handleEvent(event: EventEnvelope) {
    const rules = await this.db.automationRule.findMany({
      where: {
        enabled: true,
        triggerType: "event",
        AND: [
          { OR: [{ triggerEvent: event.name }, { triggerEvent: null }] },
          { OR: [{ brandId: null }, { brandId: event.context?.brandId }] },
        ],
      },
      select: ruleSelect,
    });

    for (const rule of rules) {
      await this.executeRule(rule, event);
    }
  }

  async runScheduled(now: Date = new Date()) {
    const rules = await this.db.automationRule.findMany({
      where: { enabled: true, triggerType: "schedule" },
      select: ruleSelect,
    });

    for (const rule of rules) {
      const config = this.parseJson(rule.triggerConfigJson) ?? {};
      if (this.shouldRunNow(config, now)) {
        await this.executeRule(rule, undefined, now);
      }
    }
  }

  async runRule(ruleId: string) {
    const rule = await this.db.automationRule.findUnique({
      where: { id: ruleId },
      select: ruleSelect,
    });
    if (!rule) throw notFound("Automation rule not found");
    await this.executeRule(rule, undefined, new Date());
  }

  private async executeRule(
    ruleRow: Prisma.AutomationRuleGetPayload<{ select: typeof ruleSelect }>,
    event?: EventEnvelope,
    now: Date = new Date(),
  ) {
    const rule = this.mapRule(ruleRow);
    if (!rule.isActive) return;
    const conditions = rule.conditionConfig ?? {};

    if (event && rule.triggerEvent && rule.triggerEvent !== event.name) return;
    if (
      event &&
      rule.brandId &&
      rule.brandId !== (event.context?.brandId ?? (event.payload as { brandId?: string })?.brandId)
    )
      return;
    if (!this.evaluateConditions(conditions, event?.payload)) return;

    let actionResults: ActionExecutionResult[] = [];
    try {
      actionResults = await this.runActions(rule.actions, event);
      await this.db.automationExecutionLog.create({
        data: {
          ruleId: rule.id,
          status: "success",
          eventName: event?.name ?? null,
          resultJson: JSON.stringify({ message: "Actions executed", actions: actionResults }),
        },
      });
      await this.db.automationRule.update({
        where: { id: rule.id },
        data: { lastRunAt: now, lastRunStatus: "success" },
      });
    } catch (err) {
      console.error("[automation] action failed", err);
      await this.db.automationExecutionLog.create({
        data: {
          ruleId: rule.id,
          status: "failure",
          eventName: event?.name ?? null,
          errorMessage: err instanceof Error ? err.message : "Unknown automation error",
          resultJson: JSON.stringify({
            message: "Action failure",
            error: err instanceof Error ? err.message : "Unknown automation error",
            actions: actionResults,
          }),
        },
      });
      await this.db.automationRule.update({
        where: { id: rule.id },
        data: { lastRunAt: now, lastRunStatus: "failure" },
      });
    }
  }

  private evaluateConditions(
    conditionConfig: { all?: ConditionConfig[]; any?: ConditionConfig[] },
    payload: unknown,
  ): boolean {
    const target = (payload ?? {}) as Record<string, unknown>;
    const evaluate = (condition: ConditionConfig) => {
      const value = this.resolvePath(target, condition.path);
      switch (condition.op) {
        case "eq":
          return value === condition.value;
        case "neq":
          return value !== condition.value;
        case "gt":
          return Number(value) > Number(condition.value);
        case "lt":
          return Number(value) < Number(condition.value);
        case "includes":
          return Array.isArray(value)
            ? value.includes(condition.value)
            : typeof value === "string" && typeof condition.value === "string"
              ? value.includes(condition.value)
              : false;
        default:
          return false;
      }
    };

    if (conditionConfig.all && conditionConfig.all.length) {
      const allMatch = conditionConfig.all.every((c) => evaluate(c));
      if (!allMatch) return false;
    }

    if (conditionConfig.any && conditionConfig.any.length) {
      return conditionConfig.any.some((c) => evaluate(c));
    }

    return true;
  }

  private async runActions(actions: ActionConfig[], event?: EventEnvelope): Promise<ActionExecutionResult[]> {
    const executed: ActionExecutionResult[] = [];
    for (const action of actions) {
      const result: ActionExecutionResult = { action: action.type };
      try {
        if (action.type === "notification") {
          await notificationService.createNotification({
            userId: action.params?.userId as string | undefined,
            brandId: this.resolveActionBrandId(action, event),
            type: (action.params?.type as string | undefined) ?? "automation",
            title: (action.params?.title as string | undefined) ?? "Automation triggered",
            message:
              (action.params?.message as string | undefined) ??
              `Rule executed${event ? ` on ${event.name}` : ""}`,
            data: { event: event?.payload ?? null },
          });
          result.details = { type: "notification" };
        } else if (action.type === "log") {
          console.log("[automation log]", action.params ?? {}, event?.name);
          result.details = { message: "logged" };
        } else if (action.type === "crm.createTask") {
          result.details = await this.createCrmTask(action, event);
        } else if (action.type === "inventory.createRefillRequest") {
          result.details = await this.createRefillRequest(action, event);
        } else if (action.type === "pricing.flagDraftForApproval") {
          result.details = await this.flagPricingDraft(action, event);
        } else {
          result.details = { message: "unsupported action" };
        }
      } catch (err) {
        result.details = { error: err instanceof Error ? err.message : "Unknown automation error" };
        executed.push(result);
        throw err;
      }
      executed.push(result);
    }
    return executed;
  }

  private async createCrmTask(action: ActionConfig, event?: EventEnvelope) {
    const params = action.params ?? {};
    const title = (params.title as string | undefined) ?? "Automated CRM task";
    const dueDate = this.parseDateParam(params.dueDate);
    const task = await this.db.cRMTask.create({
      data: {
        brandId: this.resolveActionBrandId(action, event) ?? undefined,
        title,
        dueDate,
        status: (params.status as string | undefined) ?? "OPEN",
        assignedToId: params.assignedToId as string | undefined,
        leadId: params.leadId as string | undefined,
      },
    });
    await publish(
      "crm.task.created",
      { taskId: task.id, brandId: task.brandId ?? undefined },
      { brandId: task.brandId ?? undefined, module: "automation", source: "automation" },
    );
    return { taskId: task.id, status: task.status ?? "OPEN" };
  }

  private async createRefillRequest(action: ActionConfig, event?: EventEnvelope) {
    const params = action.params ?? {};
    const standId = params.standId as string | undefined;
    if (!standId) {
      throw badRequest("standId is required for refill requests");
    }
    const resolvedBrandId = this.resolveActionBrandId(action, event) ??
      (typeof params.brandId === "string" ? params.brandId : undefined);
    const order = await this.db.standRefillOrder.create({
      data: {
        brandId: resolvedBrandId ?? null,
        standId,
        standLocationId: (params.standLocationId as string | undefined) ?? null,
        status: (params.status as string | undefined) ?? "PLANNED",
        expectedAt: this.parseDateParam(params.expectedAt) ?? null,
        notes: params.notes as string | undefined,
        source: "automation",
      },
    });
    const potentialItems = Array.isArray(params.items) ? params.items : [];
    const items = potentialItems.filter((item) => Boolean(item.productId));
    if (items.length) {
      await this.db.standRefillItem.createMany({
        data: items.map((item) => ({
          refillOrderId: order.id,
          productId: String(item.productId),
          quantity: Number(item.quantity ?? 0),
          refillSource: String(item.source ?? "automation"),
        })),
      });
    }
    await publish(
      "inventory.refill.requested",
      { orderId: order.id, brandId: order.brandId ?? undefined, standId },
      { brandId: order.brandId ?? undefined, module: "automation", source: "automation" },
    );
    return { orderId: order.id, itemsCreated: items.length };
  }

  private async flagPricingDraft(action: ActionConfig, event?: EventEnvelope) {
    const params = action.params ?? {};
    const draftId =
      (params.draftId as string | undefined) ??
      ((event?.payload as { draftId?: string })?.draftId ?? undefined);
    if (!draftId) {
      throw badRequest("draftId is required for pricing approval flags");
    }
    const draft = await this.db.productPriceDraft.findUnique({ where: { id: draftId } });
    if (!draft) {
      throw notFound("Pricing draft not found");
    }
    const brandId =
      this.resolveActionBrandId(action, event) ?? draft.brandId ?? undefined;
    const context: PricingActionContext = {
      brandId,
      actorUserId: (event?.context?.actorUserId as string | undefined) ?? undefined,
    };
    const updated = await pricingService.submitDraftForApproval(draft.productId, draftId, context);
    return { draftId: updated.id, status: updated.status };
  }

  private resolveActionBrandId(action: ActionConfig, event?: EventEnvelope) {
    const eventBrandId = typeof event?.context?.brandId === "string" ? event.context.brandId : undefined;
    const actionBrandId = typeof action.params?.brandId === "string" ? action.params.brandId : undefined;
    return eventBrandId ?? actionBrandId;
  }

  private parseDateParam(value?: unknown) {
    if (!value) return undefined;
    const parsed = new Date(String(value));
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }

  private shouldRunNow(config: Record<string, unknown>, now: Date): boolean {
    const cadence = (config.cadence as string | undefined) ?? "daily";
    if (cadence === "hourly") return true;
    if (cadence === "daily") {
      const hour = now.getHours();
      const targetHour = typeof config.hour === "number" ? (config.hour as number) : 0;
      return hour === targetHour;
    }
    return false;
  }

  private resolvePath(target: Record<string, unknown>, path: string) {
    return path.split(".").reduce<unknown>((acc, key) => {
      if (acc && typeof acc === "object" && key in acc) {
        return (acc as Record<string, unknown>)[key];
      }
      return undefined;
    }, target);
  }

  private parseJson(value?: string | null) {
    if (!value) return undefined;
    try {
      return JSON.parse(value) as Record<string, unknown>;
    } catch {
      return undefined;
    }
  }

  private mapRule(
    row: Prisma.AutomationRuleGetPayload<{ select: typeof ruleSelect }>,
  ): AutomationRuleRecord {
    const actionsWrapper = this.parseJson(row.actionsConfigJson);
    return {
      id: row.id,
      name: row.name,
      description: row.description ?? undefined,
      brandId: row.brandId ?? undefined,
      triggerType: (row.triggerType as "event" | "schedule") ?? "event",
      triggerEvent: row.triggerEvent ?? undefined,
      triggerConfig: this.parseJson(row.triggerConfigJson),
      conditionConfig: this.parseJson(row.conditionConfigJson) as
        | { all?: ConditionConfig[]; any?: ConditionConfig[] }
        | undefined,
      actions: (actionsWrapper?.actions as ActionConfig[]) ?? [],
      isActive: row.enabled ?? true,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      lastRunAt: row.lastRunAt ?? undefined,
      lastRunStatus: row.lastRunStatus ?? undefined,
    };
  }
}

// Export singleton instance for use in controllers and subscribers
export const automationService = new AutomationService();
