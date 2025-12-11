/**
 * AFFILIATE SERVICE — MH-OS v2
 * Spec: docs/os/12_affiliate-program.md (MASTER_INDEX)
 */
import type { Prisma } from "@prisma/client";
import { prisma } from "../../core/prisma.js";
import { buildPagination } from "../../core/utils/pagination.js";
import { badRequest, forbidden, notFound } from "../../core/http/errors.js";
import { logger } from "../../core/logger.js";
import {
  emitAffiliateConversionCreated,
  emitAffiliatePayoutApproved,
  emitAffiliatePayoutPaid,
  emitAffiliatePayoutRejected,
  emitAffiliatePayoutRequested,
} from "./affiliate.events.js";
import type {
  AffiliateConversionCreateInput,
  AffiliateConversionDTO,
  AffiliateConversionEventPayload,
  AffiliateDTO,
  AffiliateLinkCreateInput,
  AffiliateLinkDTO,
  AffiliateListParams,
  AffiliateListResponse,
  AffiliateCreateInput,
  AffiliatePayoutDTO,
  AffiliatePayoutRequestInput,
  AffiliatePayoutStatus,
  AffiliatePayoutStatusEventPayload,
  AffiliateStatsDTO,
  AffiliateUpdateInput,
  AffiliateDashboardSummary,
} from "./affiliate.types.js";
import * as cuid from "@paralleldrive/cuid2";

const affiliateSelect = {
  id: true,
  brandId: true,
  tierId: true,
  code: true,
  type: true,
  channel: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  tier: {
    select: {
      id: true,
      brandId: true,
      name: true,
      rulesJson: true,
    },
  },
} satisfies Prisma.AffiliateSelect;

const linkSelect = {
  id: true,
  affiliateId: true,
  linkCode: true,
  targetUrl: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.AffiliateLinkSelect;

const conversionSelect = {
  id: true,
  brandId: true,
  affiliateId: true,
  orderId: true,
  amount: true,
  currency: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.AffiliateConversionSelect;

const payoutSelect = {
  id: true,
  affiliateId: true,
  brandId: true,
  amount: true,
  currency: true,
  status: true,
  method: true,
  notes: true,
  requestedAt: true,
  resolvedAt: true,
  paidAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.AffiliatePayoutSelect;

function mapAffiliate(
  record: Prisma.AffiliateGetPayload<{ select: typeof affiliateSelect }>,
): AffiliateDTO {
  return {
    id: record.id,
    brandId: record.brandId ?? undefined,
    tierId: record.tierId ?? undefined,
    code: record.code ?? undefined,
    type: record.type ?? undefined,
    channel: record.channel ?? undefined,
    status: record.status ?? undefined,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    tier: record.tier
      ? {
          id: record.tier.id,
          brandId: record.tier.brandId ?? undefined,
          name: record.tier.name,
          rules: record.tier.rulesJson ?? null,
        }
      : null,
  };
}

function mapLink(
  record: Prisma.AffiliateLinkGetPayload<{ select: typeof linkSelect }>,
): AffiliateLinkDTO {
  return {
    id: record.id,
    affiliateId: record.affiliateId,
    linkCode: record.linkCode,
    targetUrl: record.targetUrl ?? undefined,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function mapConversion(
  record: Prisma.AffiliateConversionGetPayload<{ select: typeof conversionSelect }>,
): AffiliateConversionDTO {
  return {
    id: record.id,
    affiliateId: record.affiliateId,
    brandId: record.brandId ?? undefined,
    orderId: record.orderId ?? undefined,
    amount: record.amount != null ? Number(record.amount) : undefined,
    currency: record.currency ?? undefined,
    metadata: record.metadata ?? undefined,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function mapPayout(record: Prisma.AffiliatePayoutGetPayload<{ select: typeof payoutSelect }>): AffiliatePayoutDTO {
  return {
    id: record.id,
    affiliateId: record.affiliateId,
    brandId: record.brandId ?? undefined,
    amount: record.amount != null ? Number(record.amount) : undefined,
    currency: record.currency ?? undefined,
    status: (record.status ?? undefined) as AffiliatePayoutStatus | undefined,
    method: record.method ?? undefined,
    notes: record.notes ?? undefined,
    requestedAt: record.requestedAt,
    resolvedAt: record.resolvedAt ?? undefined,
    paidAt: record.paidAt ?? undefined,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function normalizeMetadata(value?: Record<string, unknown> | string | null) {
  if (!value) return null;
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

type AffiliateActionContext = { brandId?: string; actorUserId?: string };

function assertBrandAccess(entityBrand?: string | null, contextBrand?: string) {
  if (contextBrand && entityBrand && contextBrand !== entityBrand) {
    throw forbidden("Access denied for this brand");
  }
}

async function aggregatePerformance(
  affiliateIds: string[],
): Promise<Map<string, { clicks: number; orders: number; revenue: number }>> {
  if (!affiliateIds.length) return new Map();
  const rows = await prisma.affiliatePerformance.groupBy({
    by: ["affiliateId"],
    where: {
      affiliateId: { in: affiliateIds },
    },
    _sum: {
      clicks: true,
      orders: true,
      revenue: true,
    },
  });
  return new Map(
    rows.map((row) => [
      row.affiliateId,
      {
        clicks: row._sum.clicks ?? 0,
        orders: row._sum.orders ?? 0,
        revenue: Number(row._sum.revenue ?? 0),
      },
    ]),
  );
}

async function aggregateSales(
  affiliateIds: string[],
): Promise<Map<string, { commission: number }>> {
  if (!affiliateIds.length) return new Map();
  const rows = await prisma.affiliateSale.groupBy({
    by: ["affiliateId"],
    where: {
      affiliateId: { in: affiliateIds },
    },
    _sum: {
      commission: true,
    },
  });
  return new Map(
    rows.map((row) => [row.affiliateId, { commission: Number(row._sum.commission ?? 0) }]),
  );
}

async function aggregatePayouts(
  affiliateIds: string[],
): Promise<Map<string, { paid: number; pending: number }>> {
  if (!affiliateIds.length) return new Map();
  const rows = await prisma.affiliatePayout.groupBy({
    by: ["affiliateId", "status"],
    where: {
      affiliateId: { in: affiliateIds },
    },
    _sum: {
      amount: true,
    },
  });
  const map = new Map<string, { paid: number; pending: number }>();
  for (const row of rows) {
    const current = map.get(row.affiliateId) ?? { paid: 0, pending: 0 };
    const sum = Number(row._sum.amount ?? 0);
    if (row.status === "PAID") {
      current.paid += sum;
    } else if (row.status === "PENDING") {
      current.pending += sum;
    }
    map.set(row.affiliateId, current);
  }
  return map;
}

function enrichStats(
  affiliateId: string,
  perfMap: Map<string, { clicks: number; orders: number; revenue: number }>,
  salesMap: Map<string, { commission: number }>,
  payoutMap: Map<string, { paid: number; pending: number }>,
): AffiliateStatsDTO {
  const perf = perfMap.get(affiliateId);
  const sales = salesMap.get(affiliateId);
  const payouts = payoutMap.get(affiliateId);
  return {
    totalClicks: perf?.clicks ?? 0,
    totalOrders: perf?.orders ?? 0,
    totalRevenue: perf?.revenue ?? 0,
    totalCommission: sales?.commission ?? 0,
    paidPayouts: payouts?.paid ?? 0,
    pendingPayouts: payouts?.pending ?? 0,
  };
}

async function changePayoutStatus(
  payoutId: string,
  status: AffiliatePayoutStatus,
  context: AffiliateActionContext,
  notes?: string,
): Promise<AffiliatePayoutDTO> {
  const payout = await prisma.affiliatePayout.findUnique({
    where: { id: payoutId },
    include: { affiliate: { select: { id: true, brandId: true } } },
  });
  if (!payout) throw notFound("Payout not found");
  const brandId = payout.brandId ?? payout.affiliate?.brandId;
  assertBrandAccess(brandId ?? null, context.brandId);

  const updates: Prisma.AffiliatePayoutUpdateInput = {
    status,
    resolvedAt: new Date(),
    notes: notes ?? undefined,
  };
  if (status === "PAID") {
    updates.paidAt = new Date();
  }

  const updated = await prisma.affiliatePayout.update({
    where: { id: payoutId },
    data: updates,
    select: payoutSelect,
  });

  const payload: AffiliatePayoutStatusEventPayload = {
    brandId: brandId ?? undefined,
    affiliateId: payout.affiliateId,
    payoutId: payout.id,
    amount: updated.amount != null ? Number(updated.amount) : undefined,
    status,
    metadata: notes ? { notes } : null,
  };
    const eventContext = {
      brandId: brandId ?? undefined,
      actorUserId: context.actorUserId,
      source: "api",
    };

  if (status === "APPROVED") {
    await emitAffiliatePayoutApproved(payload, eventContext);
  } else if (status === "REJECTED") {
    await emitAffiliatePayoutRejected(payload, eventContext);
  } else if (status === "PAID") {
    await emitAffiliatePayoutPaid(payload, eventContext);
  }

  return mapPayout(updated);
}

export const affiliateService = {
  async getDashboardSummary(brandId: string): Promise<AffiliateDashboardSummary> {
    const [totalAffiliates, activeAffiliates, conversionAgg, commissionAgg, pendingPayoutAgg] =
      await prisma.$transaction([
        prisma.affiliate.count({ where: { brandId } }),
        prisma.affiliate.count({ where: { brandId, status: "ACTIVE" } }),
        prisma.affiliateConversion.aggregate({
          where: { brandId },
          _count: { id: true },
          _sum: { amount: true },
        }),
        prisma.affiliateSale.aggregate({
          where: { affiliate: { brandId } },
          _sum: { commission: true },
        }),
        prisma.affiliatePayout.aggregate({
          where: { brandId, status: "PENDING" },
          _sum: { amount: true },
        }),
      ]);

    return {
      totalAffiliates,
      activeAffiliates,
      totalConversions: conversionAgg._count.id ?? 0,
      totalRevenue: Number(conversionAgg._sum.amount ?? 0),
      totalCommission: Number(commissionAgg._sum?.commission ?? 0),
      pendingPayouts: Number(pendingPayoutAgg._sum.amount ?? 0),
    };
  },

  async listAffiliates(params: AffiliateListParams): Promise<AffiliateListResponse> {
    const { brandId, search, status, tierId, page = 1, pageSize = 20 } = params;
    const { skip, take } = buildPagination({ page, pageSize });
    const where: Prisma.AffiliateWhereInput = { brandId };

    if (search) {
      where.OR = [
        { code: { contains: search, mode: "insensitive" } },
        { type: { contains: search, mode: "insensitive" } },
        { channel: { contains: search, mode: "insensitive" } },
      ];
    }
    if (status) where.status = status;
    if (tierId) where.tierId = tierId;

    const [total, rows] = await prisma.$transaction([
      prisma.affiliate.count({ where }),
      prisma.affiliate.findMany({
        where,
        select: affiliateSelect,
        orderBy: { updatedAt: "desc" },
        skip,
        take,
      }),
    ]);

    const ids = rows.map((row) => row.id);
    const [perfMap, salesMap, payoutMap] = await Promise.all([
      aggregatePerformance(ids),
      aggregateSales(ids),
      aggregatePayouts(ids),
    ]);

    return {
      total,
      page,
      pageSize: take,
      items: rows.map((row) => ({
        ...mapAffiliate(row),
        stats: enrichStats(row.id, perfMap, salesMap, payoutMap),
      })),
    };
  },

  async getAffiliateById(affiliateId: string, brandId: string): Promise<AffiliateDTO | null> {
    const record = await prisma.affiliate.findFirst({
      where: { id: affiliateId, brandId },
      select: affiliateSelect,
    });
    if (!record) return null;

    const [perfMap, salesMap, payoutMap] = await Promise.all([
      aggregatePerformance([affiliateId]),
      aggregateSales([affiliateId]),
      aggregatePayouts([affiliateId]),
    ]);

    return {
      ...mapAffiliate(record),
      stats: enrichStats(affiliateId, perfMap, salesMap, payoutMap),
    };
  },

  async createAffiliate(input: AffiliateCreateInput): Promise<AffiliateDTO> {
    const code = input.code ?? cuid.createId();
    const existing = await prisma.affiliate.findFirst({
      where: { brandId: input.brandId, code },
    });
    if (existing) {
      throw badRequest("Affiliate code already in use");
    }

    const created = await prisma.affiliate.create({
      data: {
        brandId: input.brandId,
        tierId: input.tierId ?? null,
        code,
        type: input.type ?? null,
        channel: input.channel ?? null,
        status: input.status ?? "ACTIVE",
      },
      select: affiliateSelect,
    });

    logger.info(`[affiliate] Created affiliate ${created.id} for brand ${input.brandId}`);
    return mapAffiliate(created);
  },

  async updateAffiliate(
    affiliateId: string,
    brandId: string,
    input: AffiliateUpdateInput,
  ): Promise<AffiliateDTO> {
    const existing = await prisma.affiliate.findFirst({ where: { id: affiliateId, brandId } });
    if (!existing) throw notFound("Affiliate not found");

    const updated = await prisma.affiliate.update({
      where: { id: affiliateId },
      data: {
        tierId: input.tierId ?? existing.tierId,
        code: input.code ?? existing.code,
        type: input.type ?? existing.type,
        channel: input.channel ?? existing.channel,
        status: input.status ?? existing.status,
      },
      select: affiliateSelect,
    });

    return mapAffiliate(updated);
  },

  async deactivateAffiliate(affiliateId: string, brandId: string): Promise<AffiliateDTO> {
    const existing = await prisma.affiliate.findFirst({ where: { id: affiliateId, brandId } });
    if (!existing) throw notFound("Affiliate not found");
    const updated = await prisma.affiliate.update({
      where: { id: affiliateId },
      data: { status: "INACTIVE" },
      select: affiliateSelect,
    });
    return mapAffiliate(updated);
  },

  async getAffiliateStats(affiliateId: string, brandId: string): Promise<AffiliateStatsDTO> {
    const [perfMap, salesMap, payoutMap] = await Promise.all([
      aggregatePerformance([affiliateId]),
      aggregateSales([affiliateId]),
      aggregatePayouts([affiliateId]),
    ]);
    return enrichStats(affiliateId, perfMap, salesMap, payoutMap);
  },

  async listLinks(affiliateId: string, brandId: string): Promise<AffiliateLinkDTO[]> {
    await this.getAffiliateById(affiliateId, brandId); // ensure exists
    const links = await prisma.affiliateLink.findMany({
      where: { affiliateId },
      select: linkSelect,
      orderBy: { createdAt: "desc" },
    });
    return links.map(mapLink);
  },

  async createLink(input: AffiliateLinkCreateInput): Promise<AffiliateLinkDTO> {
    const affiliate = await prisma.affiliate.findFirst({
      where: { id: input.affiliateId },
      select: { id: true, brandId: true },
    });
    if (!affiliate) throw notFound("Affiliate not found");
    const linkCode = cuid.createId();
    const created = await prisma.affiliateLink.create({
      data: {
        affiliateId: input.affiliateId,
        linkCode,
        targetUrl: input.targetUrl ?? null,
      },
      select: linkSelect,
    });
    logger.info(`[affiliate] Created link ${linkCode} for affiliate ${affiliate.id}`);
    return mapLink(created);
  },

  async createConversion(
    input: AffiliateConversionCreateInput,
    context: AffiliateActionContext,
  ): Promise<AffiliateConversionDTO> {
    const affiliate = await prisma.affiliate.findFirst({
      where: { id: input.affiliateId },
      select: { id: true, brandId: true },
    });
    if (!affiliate) throw notFound("Affiliate not found");
    assertBrandAccess(affiliate.brandId, context.brandId);

    const conversion = await prisma.affiliateConversion.create({
      data: {
        affiliateId: affiliate.id,
        brandId: affiliate.brandId ?? null,
        orderId: input.orderId ?? null,
        amount: input.amount ?? null,
        currency: input.currency ?? null,
        metadata: normalizeMetadata(input.metadata),
      },
      select: conversionSelect,
    });

    const payload: AffiliateConversionEventPayload = {
      brandId: affiliate.brandId ?? undefined,
      affiliateId: affiliate.id,
      orderId: conversion.orderId ?? undefined,
      amount: conversion.amount != null ? Number(conversion.amount) : undefined,
      currency: conversion.currency ?? undefined,
      metadata: input.metadata ?? null,
    };
    await emitAffiliateConversionCreated(payload, {
      brandId: affiliate.brandId ?? undefined,
      actorUserId: context.actorUserId,
      source: "api",
    });

    return mapConversion(conversion);
  },

  async requestPayout(
    input: AffiliatePayoutRequestInput,
    context: AffiliateActionContext,
  ): Promise<AffiliatePayoutDTO> {
    const affiliate = await prisma.affiliate.findFirst({
      where: { id: input.affiliateId },
      select: { id: true, brandId: true },
    });
    if (!affiliate) throw notFound("Affiliate not found");
    assertBrandAccess(affiliate.brandId, context.brandId);

    const created = await prisma.affiliatePayout.create({
      data: {
        affiliateId: affiliate.id,
        brandId: affiliate.brandId ?? null,
        amount: input.amount,
        currency: input.currency ?? null,
        status: "PENDING",
        requestedAt: new Date(),
        method: input.method ?? null,
        notes: input.notes ?? null,
      },
      select: payoutSelect,
    });

    const payload: AffiliatePayoutStatusEventPayload = {
      brandId: affiliate.brandId ?? undefined,
      affiliateId: affiliate.id,
      payoutId: created.id,
      amount: created.amount != null ? Number(created.amount) : undefined,
      status: "PENDING",
      metadata: input.notes ? { notes: input.notes } : null,
    };
    await emitAffiliatePayoutRequested(payload, {
      brandId: affiliate.brandId ?? undefined,
      actorUserId: context.actorUserId,
      source: "api",
    });

    return mapPayout(created);
  },

  async approvePayout(payoutId: string, context: AffiliateActionContext): Promise<AffiliatePayoutDTO> {
    return changePayoutStatus(payoutId, "APPROVED", context);
  },

  async rejectPayout(
    payoutId: string,
    context: AffiliateActionContext,
    notes?: string,
  ): Promise<AffiliatePayoutDTO> {
    return changePayoutStatus(payoutId, "REJECTED", context, notes);
  },

  async markPayoutPaid(payoutId: string, context: AffiliateActionContext): Promise<AffiliatePayoutDTO> {
    return changePayoutStatus(payoutId, "PAID", context);
  },
};
