/**
 * CRM SERVICE — MH-OS v2
 * Spec: docs/os/17_crm-os.md (MASTER_INDEX)
 */
import type { Prisma } from "@prisma/client";
import { prisma } from "../../core/prisma.js";
import { badRequest, forbidden, notFound } from "../../core/http/errors.js";
import { buildPagination } from "../../core/utils/pagination.js";
import {
  emitCrmLeadCreated,
  emitCrmLeadDeleted,
  emitCrmLeadScored,
  emitCrmLeadUpdated,
  emitCrmLeadContacted,
  emitCrmLeadCustomerCreated,
} from "./crm.events.js";
import type {
  ConvertLeadToContactInput,
  ConvertLeadToCustomerInput,
  CrmContactEventPayload,
  CrmCustomerEventPayload,
  CrmCustomerRecord,
  CrmLeadEventPayload,
  CrmLeadScoredEventPayload,
  CrmSegmentCreateInput,
  CrmSegmentLeadsResult,
  CrmSegmentRecord,
  CrmSegmentUpdateInput,
  LeadRecord,
  CreateLeadInput,
  UpdateLeadInput,
  CrmSegmentFilter,
} from "./crm.types.js";
import { orchestrateAI, makeCacheKey } from "../../core/ai/orchestrator.js";
import { crmScorePrompt } from "../../core/ai/prompt-templates.js";
import type { EventContext } from "../../core/events/event-bus.js";
import type { CrmScoreInput, CrmScoreResult } from "./crm.ai.types.js";

type CrmActionContext = {
  brandId?: string;
  actorUserId?: string;
  tenantId?: string;
};

function buildCrmEventContext(context?: CrmActionContext): EventContext {
  return {
    brandId: context?.brandId ?? undefined,
    actorUserId: context?.actorUserId ?? undefined,
    tenantId: context?.tenantId ?? undefined,
    source: "api",
  };
}

const leadSelect = {
  id: true,
  brandId: true,
  score: true,
  status: true,
  ownerId: true,
  sourceId: true,
  createdAt: true,
  updatedAt: true,
  person: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
  company: { select: { id: true, name: true } },
  crmCustomer: { select: { id: true } },
  _count: { select: { deals: true } },
} satisfies Prisma.LeadSelect;

const segmentSelect = {
  id: true,
  brandId: true,
  name: true,
  filterJson: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.CRMSegmentSelect;

const crmCustomerSelect = {
  id: true,
  leadId: true,
  brandId: true,
  personId: true,
  companyId: true,
  firstOrderId: true,
  firstRevenueRecordId: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.CrmCustomerSelect;

class CrmService {
  constructor(private readonly db = prisma) {}

  async list(
    params: {
      brandId?: string;
      status?: string;
      search?: string;
      page?: number;
      pageSize?: number;
    } = {},
    context?: CrmActionContext,
  ) {
    const { brandId, status, search } = params;
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(params.pageSize ?? 20, 100);
    const { skip, take } = buildPagination({ page, pageSize });

    const where: Prisma.LeadWhereInput = {};
    const scopedBrandId = context?.brandId ?? brandId;
    if (scopedBrandId) where.brandId = scopedBrandId;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { person: { firstName: { contains: search, mode: "insensitive" } } },
        { person: { lastName: { contains: search, mode: "insensitive" } } },
        { person: { email: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [total, rows] = await this.db.$transaction([
      this.db.lead.count({ where }),
      this.db.lead.findMany({
        where,
        select: leadSelect,
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
    ]);

    return {
      items: rows.map((row) => this.mapLead(row)),
      total,
      page,
      pageSize: take,
    };
  }

  async getById(id: string, context?: CrmActionContext): Promise<LeadRecord> {
    const lead = await this.db.lead.findUnique({ where: { id }, select: leadSelect });
    if (!lead) throw notFound("Lead not found");
    if (context?.brandId && lead.brandId && lead.brandId !== context.brandId) {
      throw forbidden("Access denied for this brand");
    }
    return this.mapLead(lead);
  }

  async scoreLead(leadId: string, intent?: string, context?: CrmActionContext): Promise<CrmScoreResult> {
    const lead = await this.db.lead.findUnique({
      where: { id: leadId },
      select: {
        brandId: true,
        person: { select: { firstName: true, lastName: true } },
      },
    });
    if (!lead) throw notFound("Lead not found");
    if (context?.brandId && lead.brandId && lead.brandId !== context.brandId) {
      throw forbidden("Access denied for this brand");
    }
    const leadName = [lead.person?.firstName, lead.person?.lastName].filter(Boolean).join(" ").trim();
    const payload: CrmScoreInput = {
      leadName: leadName || "Lead",
      intent,
    };
    const aiResult = await crmServiceAI.scoreLead(payload, context);
    await this.logCrmInsight(leadId, lead.brandId ?? undefined, aiResult);
    const scoredPayload: CrmLeadScoredEventPayload = {
      leadId,
      brandId: lead.brandId ?? undefined,
      score: aiResult.score,
      probability: aiResult.probability ?? null,
      nextAction: aiResult.nextAction ?? null,
    };
    await emitCrmLeadScored(scoredPayload, buildCrmEventContext(context));
    return aiResult;
  }

  async create(input: CreateLeadInput, context?: CrmActionContext): Promise<LeadRecord> {
    const personId = await this.ensurePerson(input);
    const brandId = context?.brandId ?? input.brandId ?? null;
    const created = await this.db.lead.create({
      data: {
        brandId,
        personId,
        status: input.status ?? "new",
        ownerId: input.ownerId ?? null,
        sourceId: input.sourceId ?? null,
      },
      select: leadSelect,
    });
    const eventContext = buildCrmEventContext({
      brandId: context?.brandId ?? created.brandId ?? undefined,
      actorUserId: context?.actorUserId,
    });
    const createdPayload: CrmLeadEventPayload = {
      leadId: created.id,
      brandId: created.brandId ?? undefined,
      status: created.status ?? undefined,
      ownerId: created.ownerId ?? undefined,
      sourceId: created.sourceId ?? undefined,
      score: created.score ?? undefined,
    };
    await emitCrmLeadCreated(createdPayload, {
      ...eventContext,
      brandId: created.brandId ?? undefined,
    });
    return this.mapLead(created);
  }

  async update(id: string, input: UpdateLeadInput, context?: CrmActionContext): Promise<LeadRecord> {
    const existing = await this.db.lead.findUnique({ where: { id }, select: leadSelect });
    if (!existing) throw notFound("Lead not found");
    if (context?.brandId && existing.brandId && existing.brandId !== context.brandId) {
      throw forbidden("Access denied for this brand");
    }

    const personId =
      input.email || input.name || input.phone
        ? await this.ensurePerson(input, existing.brandId ?? undefined)
        : undefined;

    const finalBrandId = context?.brandId ?? input.brandId ?? existing.brandId;
    const updated = await this.db.lead.update({
      where: { id },
      data: {
        brandId: finalBrandId,
        status: input.status ?? existing.status,
        ownerId: input.ownerId ?? existing.ownerId,
        sourceId: input.sourceId ?? undefined,
        personId: personId ?? existing.person?.id ?? undefined,
      },
      select: leadSelect,
    });
    const eventContext = buildCrmEventContext({
      brandId: context?.brandId ?? updated.brandId ?? undefined,
      actorUserId: context?.actorUserId,
    });
    const updatedPayload: CrmLeadEventPayload = {
      leadId: updated.id,
      brandId: updated.brandId ?? undefined,
      status: updated.status ?? undefined,
      ownerId: updated.ownerId ?? undefined,
      sourceId: updated.sourceId ?? undefined,
      score: updated.score ?? undefined,
    };
    await emitCrmLeadUpdated(updatedPayload, {
      ...eventContext,
      brandId: updated.brandId ?? undefined,
    });
    return this.mapLead(updated);
  }

  async remove(id: string, context?: CrmActionContext) {
    const lead = await this.db.lead.findUnique({
      where: { id },
      select: { id: true, brandId: true },
    });
    if (!lead) throw notFound("Lead not found");
    if (context?.brandId && lead.brandId && lead.brandId !== context.brandId) {
      throw forbidden("Access denied for this brand");
    }
    await this.db.lead.delete({ where: { id } });
    const eventContext = buildCrmEventContext({
      brandId: context?.brandId ?? lead.brandId ?? undefined,
      actorUserId: context?.actorUserId,
    });
    await emitCrmLeadDeleted(
      { leadId: lead.id, brandId: lead.brandId ?? undefined },
      { ...eventContext, brandId: lead.brandId ?? undefined },
    );
    return { id };
  }

  async convertLeadToContact(
    leadId: string,
    input: ConvertLeadToContactInput,
    context?: CrmActionContext,
  ): Promise<LeadRecord> {
    const lead = await this.db.lead.findUnique({
      where: { id: leadId },
      select: { id: true, brandId: true, ownerId: true },
    });
    if (!lead) throw notFound("Lead not found");
    if (context?.brandId && lead.brandId && lead.brandId !== context.brandId) {
      throw forbidden("Access denied for this brand");
    }

    const updated = await this.db.lead.update({
      where: { id: leadId },
      data: {
        status: "contact",
        ownerId: input.ownerId ?? lead.ownerId ?? null,
      },
      select: leadSelect,
    });
    const contactPayload: CrmContactEventPayload = {
      leadId: updated.id,
      brandId: updated.brandId ?? undefined,
      ownerId: updated.ownerId ?? undefined,
      notes: input.notes ?? undefined,
    };
    await emitCrmLeadContacted(contactPayload, buildCrmEventContext(context));
    return this.mapLead(updated);
  }

  async convertLeadToCustomer(
    leadId: string,
    input: ConvertLeadToCustomerInput,
    context?: CrmActionContext,
  ): Promise<{ lead: LeadRecord; customer: CrmCustomerRecord }> {
    if (!input.orderId && !input.revenueRecordId) {
      throw badRequest("orderId or revenueRecordId is required");
    }

    const lead = await this.db.lead.findUnique({
      where: { id: leadId },
      select: { id: true, brandId: true, personId: true, companyId: true, ownerId: true },
    });
    if (!lead) throw notFound("Lead not found");
    if (context?.brandId && lead.brandId && lead.brandId !== context.brandId) {
      throw forbidden("Access denied for this brand");
    }

    const [order, revenueRecord] = await Promise.all([
      input.orderId
        ? this.db.salesOrder.findUnique({ where: { id: input.orderId }, select: { id: true, brandId: true } })
        : null,
      input.revenueRecordId
        ? this.db.revenueRecord.findUnique({
            where: { id: input.revenueRecordId },
            select: { id: true, brandId: true },
          })
        : null,
    ]);

    if (input.orderId && !order) {
      throw notFound("Sales order not found");
    }
    if (input.revenueRecordId && !revenueRecord) {
      throw notFound("Revenue record not found");
    }

    if (await this.db.crmCustomer.findFirst({ where: { leadId } })) {
      throw badRequest("Lead already converted to customer");
    }

    const brandCandidates = new Set<string>();
    if (context?.brandId) brandCandidates.add(context.brandId);
    if (lead.brandId) brandCandidates.add(lead.brandId);
    if (order?.brandId) brandCandidates.add(order.brandId);
    if (revenueRecord?.brandId) brandCandidates.add(revenueRecord.brandId);
    if (brandCandidates.size > 1) {
      throw badRequest("Brand mismatch between CRM lead and finance records");
    }
    const resolvedBrandId = brandCandidates.size === 1 ? Array.from(brandCandidates)[0] : null;

    const { customer, updatedLead } = await this.db.$transaction(async (tx) => {
      const created = await tx.crmCustomer.create({
        data: {
          leadId: lead.id,
          brandId: resolvedBrandId,
          personId: lead.personId ?? null,
          companyId: lead.companyId ?? null,
          firstOrderId: order?.id ?? null,
          firstRevenueRecordId: revenueRecord?.id ?? null,
        },
        select: crmCustomerSelect,
      });

      const updated = await tx.lead.update({
        where: { id: leadId },
        data: {
          status: "customer",
          ownerId: input.ownerId ?? lead.ownerId ?? null,
          brandId: resolvedBrandId ?? lead.brandId ?? null,
        },
        select: leadSelect,
      });

      return { customer: created, updatedLead: updated };
    });

    const payload: CrmCustomerEventPayload = {
      leadId: updatedLead.id,
      brandId: resolvedBrandId ?? undefined,
      ownerId: updatedLead.ownerId ?? undefined,
      customerId: customer.id,
      orderId: order?.id ?? undefined,
      revenueRecordId: revenueRecord?.id ?? undefined,
      notes: input.notes ?? undefined,
    };
    await emitCrmLeadCustomerCreated(payload, buildCrmEventContext(context));

    return { lead: this.mapLead(updatedLead), customer: this.mapCustomer(customer) };
  }

  private async ensurePerson(input: CreateLeadInput, brandId?: string) {
    if (!input.email && !input.name && !input.phone) {
      throw badRequest("Lead requires at least a name or email");
    }
    if (input.email) {
      const existing = await this.db.person.findUnique({
        where: { email: input.email },
        select: { id: true },
      });
      if (existing) return existing.id;
    }
    const [firstName, ...rest] = (input.name ?? "").split(" ");
    const lastName = rest.join(" ") || undefined;
    const person = await this.db.person.create({
      data: {
        brandId: input.brandId ?? brandId ?? null,
        firstName: firstName || null,
        lastName: lastName ?? null,
        email: input.email ?? null,
        phone: input.phone ?? null,
      },
    });
    return person.id;
  }

  private mapLead(row: Prisma.LeadGetPayload<{ select: typeof leadSelect }>): LeadRecord {
    const fullName = [row.person?.firstName, row.person?.lastName].filter(Boolean).join(" ").trim();
    return {
      id: row.id,
      brandId: row.brandId ?? undefined,
      status: row.status ?? undefined,
      ownerId: row.ownerId ?? undefined,
      name: fullName || undefined,
      email: row.person?.email ?? undefined,
      phone: row.person?.phone ?? undefined,
      companyName: row.company?.name ?? undefined,
      score: row.score ?? undefined,
      dealCount: row._count.deals,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      customerId: row.crmCustomer?.id ?? undefined,
    };
  }

  private mapCustomer(record: Prisma.CrmCustomerGetPayload<{ select: typeof crmCustomerSelect }>): CrmCustomerRecord {
    return {
      id: record.id,
      leadId: record.leadId,
      brandId: record.brandId ?? undefined,
      personId: record.personId ?? undefined,
      companyId: record.companyId ?? undefined,
      firstOrderId: record.firstOrderId ?? undefined,
      firstRevenueRecordId: record.firstRevenueRecordId ?? undefined,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  private async logCrmInsight(
    leadId: string,
    brandId: string | undefined,
    payload: CrmScoreResult,
  ) {
    await this.db.aIInsight.create({
      data: {
        brandId: brandId ?? null,
        os: "crm",
        entityType: "lead-score",
        entityId: leadId,
        summary: `Lead score ${payload.score}`,
        details: JSON.stringify({
          payload,
          confidence: payload.probability,
          risk: payload.nextAction,
        }),
      },
    });
  }

  async createSegment(
    input: CrmSegmentCreateInput,
    context?: CrmActionContext,
  ): Promise<CrmSegmentRecord> {
    const brandId = context?.brandId ?? input.brandId ?? null;
    const created = await this.db.cRMSegment.create({
      data: {
        brandId,
        name: input.name,
        filterJson: input.filter ? this.normalizeFilter(input.filter) : undefined,
      },
      select: segmentSelect,
    });
    return this.mapSegment(created);
  }

  async listSegments(
    params: { page?: number; pageSize?: number } = {},
    context?: CrmActionContext,
  ): Promise<{ items: CrmSegmentRecord[]; total: number; page: number; pageSize: number }> {
    const where: Prisma.CRMSegmentWhereInput = {};
    if (context?.brandId) where.brandId = context.brandId;
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(params.pageSize ?? 20, 100);
    const { skip, take } = buildPagination({ page, pageSize });
    const [total, rows] = await this.db.$transaction([
      this.db.cRMSegment.count({ where }),
      this.db.cRMSegment.findMany({
        where,
        select: segmentSelect,
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
    ]);
    return { items: rows.map((row) => this.mapSegment(row)), total, page, pageSize: take };
  }

  async getSegmentById(id: string, context?: CrmActionContext): Promise<CrmSegmentRecord> {
    const segment = await this.db.cRMSegment.findUnique({
      where: { id },
      select: segmentSelect,
    });
    if (!segment) {
      throw notFound("Segment not found");
    }
    if (context?.brandId && segment.brandId && segment.brandId !== context.brandId) {
      throw forbidden("Segment does not belong to the requested brand");
    }
    return this.mapSegment(segment);
  }

  async getSegmentsByIds(
    ids: string[],
    context?: CrmActionContext,
  ): Promise<CrmSegmentRecord[]> {
    if (!ids.length) return [];
    const where: Prisma.CRMSegmentWhereInput = { id: { in: ids } };
    if (context?.brandId) where.brandId = context.brandId;
    const rows = await this.db.cRMSegment.findMany({
      where,
      select: segmentSelect,
    });
    if (context?.brandId) {
      const missing = ids.filter((id) => !rows.find((row) => row.id === id));
      if (missing.length) {
        throw notFound("Some segments were not found for this brand");
      }
    }
    return rows.map((row) => this.mapSegment(row));
  }

  async resolveSegmentLeads(
    segmentId: string,
    options: { limit?: number } = {},
    context?: CrmActionContext,
  ): Promise<CrmSegmentLeadsResult> {
    const segment = await this.db.cRMSegment.findUnique({
      where: { id: segmentId },
      select: segmentSelect,
    });
    if (!segment) {
      throw notFound("Segment not found");
    }
    const brandId = context?.brandId ?? segment.brandId ?? undefined;
    if (context?.brandId && segment.brandId && segment.brandId !== context.brandId) {
      throw forbidden("Access denied for this brand");
    }
    const filter = this.parseSegmentFilter(segment.filterJson);
    const where = this.buildSegmentWhere(filter, brandId);
    const limit = Math.min(Math.max(options.limit ?? 5, 1), 50);
    const [total, rows] = await this.db.$transaction([
      this.db.lead.count({ where }),
      this.db.lead.findMany({
        where,
        select: leadSelect,
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
    ]);
    return {
      segmentId,
      total,
      leads: rows.map((row) => this.mapLead(row)),
    };
  }

  private normalizeFilter(filter: CrmSegmentFilter): Prisma.InputJsonValue {
    return {
      statuses: filter.statuses,
      sourceIds: filter.sourceIds,
      ownerIds: filter.ownerIds,
      minScore: filter.minScore,
      maxScore: filter.maxScore,
      createdAfter: filter.createdAfter,
      createdBefore: filter.createdBefore,
    } satisfies Prisma.InputJsonValue;
  }

  private mapSegment(row: Prisma.CRMSegmentGetPayload<{ select: typeof segmentSelect }>): CrmSegmentRecord {
    return {
      id: row.id,
      brandId: row.brandId ?? undefined,
      name: row.name,
      filter: this.parseSegmentFilter(row.filterJson),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private parseSegmentFilter(value?: Prisma.JsonValue | null): CrmSegmentFilter | undefined {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return undefined;
    }
    const obj = value as Record<string, unknown>;
    const parseStringArray = (input?: unknown): string[] | undefined => {
      if (!input) return undefined;
      if (Array.isArray(input)) {
        return input
          .map((item) => (typeof item === "string" ? item.trim() : null))
          .filter((item): item is string => Boolean(item));
      }
      if (typeof input === "string") {
        const trimmed = input.trim();
        return trimmed ? [trimmed] : undefined;
      }
      return undefined;
    };
    const parseNumber = (input?: unknown): number | undefined => {
      if (input === undefined || input === null) return undefined;
      const parsed = Number(input);
      return Number.isFinite(parsed) ? parsed : undefined;
    };
    const parseDate = (input?: unknown): string | undefined => {
      if (input === undefined || input === null) return undefined;
      const candidate = new Date(String(input));
      return Number.isNaN(candidate.getTime()) ? undefined : candidate.toISOString();
    };

    return {
      statuses: parseStringArray(obj.statuses),
      sourceIds: parseStringArray(obj.sourceIds),
      ownerIds: parseStringArray(obj.ownerIds),
      minScore: parseNumber(obj.minScore),
      maxScore: parseNumber(obj.maxScore),
      createdAfter: parseDate(obj.createdAfter),
      createdBefore: parseDate(obj.createdBefore),
    };
  }

  private buildSegmentWhere(filter?: CrmSegmentFilter, brandId?: string): Prisma.LeadWhereInput {
    const where: Prisma.LeadWhereInput = {};
    if (brandId) {
      where.brandId = brandId;
    }
    if (filter?.statuses?.length) {
      where.status = { in: filter.statuses };
    }
    if (filter?.sourceIds?.length) {
      where.sourceId = { in: filter.sourceIds };
    }
    if (filter?.ownerIds?.length) {
      where.ownerId = { in: filter.ownerIds };
    }
    if (filter?.minScore !== undefined || filter?.maxScore !== undefined) {
      where.score = {};
      if (filter.minScore !== undefined) {
        where.score.gte = filter.minScore;
      }
      if (filter.maxScore !== undefined) {
        where.score.lte = filter.maxScore;
      }
    }
    if (filter?.createdAfter || filter?.createdBefore) {
      where.createdAt = {};
      if (filter?.createdAfter) {
        where.createdAt.gte = new Date(filter.createdAfter);
      }
      if (filter?.createdBefore) {
        where.createdAt.lte = new Date(filter.createdBefore);
      }
    }
    return where;
  }
}

export const crmService = new CrmService();

export const crmServiceAI = {
  async scoreLead(payload: CrmScoreInput, context?: CrmActionContext): Promise<CrmScoreResult> {
    const prompt = crmScorePrompt({
      leadName: payload.leadName,
      intent: payload.intent,
      scoreFactors: "recent activity and fit",
    });
    const cacheKey = makeCacheKey("crm-ai", {
      ...payload,
      brandId: context?.brandId,
      tenantId: context?.tenantId,
    });
    const result = await orchestrateAI({
      key: cacheKey,
      messages: [{ role: "user", content: prompt }],
      fallback: (): CrmScoreResult => ({
        score: 55,
        probability: 0.4,
        reasons: ["Fallback score", "No AI response"],
        nextAction: "Follow up manually",
      }),
    });
    return result.result;
  },
};
