/**
 * STAND SERVICE — MH-OS v2
 * Spec: docs/os/09_stand-program.md (MASTER_INDEX)
 */

import type { Prisma } from "@prisma/client";
import { prisma } from "../../core/prisma.js";
import { buildPagination } from "../../core/utils/pagination.js";
import { badRequest, notFound } from "../../core/http/errors.js";
import { logger } from "../../core/logger.js";

import type {
  StandPartnerCreateInput,
  StandPartnerDTO,
  StandPartnerListParams,
  StandPartnerListResponse,
  StandPartnerStatsDTO,
  StandPartnerUpdateInput,
  StandDashboardSummary,
} from "./stand.types.js";

// ------------------------------------------------------
// SELECT SHAPE
// ------------------------------------------------------
const standPartnerSelect = {
  id: true,
  brandId: true,
  partnerId: true,
  standType: true,
  locationAddress: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  partner: {
    select: {
      id: true,
      name: true,
      city: true,
      country: true,
    },
  },
} satisfies Prisma.StandPartnerSelect;

// ------------------------------------------------------
// DTO MAPPER
// ------------------------------------------------------
function mapStandPartner(
  record: Prisma.StandPartnerGetPayload<{ select: typeof standPartnerSelect }>,
): StandPartnerDTO {
  const brandIdValue: string | null = record.brandId ?? null;
  return {
    id: record.id,
    brandId: brandIdValue,
    partnerId: record.partnerId,
      standType: record.standType ?? undefined,
      locationAddress: record.locationAddress ?? undefined,
    status: record.status ?? null,

    createdAt: record.createdAt,
    updatedAt: record.updatedAt,

    partner: {
      name: record.partner?.name ?? undefined,
      city: record.partner?.city ?? undefined,
      country: record.partner?.country ?? undefined,
    },
  };
}

// ------------------------------------------------------
// STATS AGGREGATOR (fixed brandId logic)
// ------------------------------------------------------
/**
 * Important fix:
 * StandUnit DOES NOT have brandId → must filter via StandPartner.brandId
 * StandOrder DOES NOT store brandId necessarily → must filter on standPartnerId
 */
async function aggregateStandStats(
  standPartnerIds: string[],
  brandId: string,
): Promise<Map<string, StandPartnerStatsDTO>> {
  if (!standPartnerIds.length) return new Map();

  // Units per standPartner
  const unitGroups = await prisma.standUnit.groupBy({
    by: ["standPartnerId"],
    _count: { _all: true },
    where: {
      standPartnerId: { in: standPartnerIds },
      // brandId filter happens on StandPartner, not standUnit
      standPartner: { brandId },
    },
  });

  // Orders per standPartner
  const orderGroups = await prisma.standOrder.groupBy({
    by: ["standPartnerId"],
    _count: { _all: true },
    _sum: { total: true },
    _max: { createdAt: true },
    where: {
      standPartnerId: { in: standPartnerIds },
      brandId, // StandOrder DOES HAVE brandId
    },
  });

  const stats = new Map<string, StandPartnerStatsDTO>();

  // Units
    for (const row of unitGroups) {
      stats.set(row.standPartnerId, {
        standPartnerId: row.standPartnerId,
        totalUnits: row._count._all,
        totalOrders: 0,
        totalRevenue: 0,
        lastOrderAt: null,
      });
    }

  // Orders
    for (const row of orderGroups) {
      const base = stats.get(row.standPartnerId) ?? {
        standPartnerId: row.standPartnerId,
        totalUnits: 0,
        totalOrders: 0,
        totalRevenue: 0,
        lastOrderAt: null,
      };
    base.totalOrders = row._count._all;
    base.totalRevenue = Number(row._sum.total ?? 0);
    base.lastOrderAt = row._max.createdAt ?? null;
    stats.set(row.standPartnerId, base);
  }

  return stats;
}

// ------------------------------------------------------
// MAIN SERVICE
// ------------------------------------------------------
export const standService = {
  async getDashboardSummary(brandId: string): Promise<StandDashboardSummary> {
    const [totalPartners, activePartners, unitAgg, orderAgg] = await prisma.$transaction([
      prisma.standPartner.count({ where: { brandId } }),
      prisma.standPartner.count({ where: { brandId, status: "ACTIVE" } }),
      prisma.standUnit.aggregate({
        where: { standPartner: { brandId } },
        _count: { id: true },
      }),
      prisma.standOrder.aggregate({
        where: { brandId },
        _count: { id: true },
        _sum: { total: true },
        _max: { createdAt: true },
      }),
    ]);

    return {
      totalPartners,
      activePartners,
      totalUnits: unitAgg._count.id ?? 0,
      totalOrders: orderAgg._count.id ?? 0,
      totalRevenue: Number(orderAgg._sum.total ?? 0),
      lastOrderAt: orderAgg._max.createdAt ?? null,
    };
  },

  // ------------------------------------------
  // LIST
  // ------------------------------------------
  async listStandPartners(params: StandPartnerListParams): Promise<StandPartnerListResponse> {
    const { brandId, search, status, page = 1, pageSize = 20 } = params;
    const { skip, take } = buildPagination({ page, pageSize });

    const where: Prisma.StandPartnerWhereInput = { brandId };

    if (status) where.status = status;

    if (search) {
      where.OR = [
        { locationAddress: { contains: search, mode: "insensitive" } },
        { partner: { name: { contains: search, mode: "insensitive" } } },
        { partner: { city: { contains: search, mode: "insensitive" } } },
        { partner: { country: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [total, rows] = await prisma.$transaction([
      prisma.standPartner.count({ where }),
      prisma.standPartner.findMany({
        where,
        select: standPartnerSelect,
        orderBy: { updatedAt: "desc" },
        skip,
        take,
      }),
    ]);

    const stats = await aggregateStandStats(
      rows.map((r) => r.id),
      brandId,
    );

    return {
      total,
      page,
      pageSize: take,
      items: rows.map((r) => ({
        ...mapStandPartner(r),
        stats: stats.get(r.id),
      })),
    };
  },

  // ------------------------------------------
  // GET ONE
  // ------------------------------------------
  async getStandPartnerById(id: string, brandId: string): Promise<StandPartnerDTO | null> {
    const record = await prisma.standPartner.findFirst({
      where: { id, brandId },
      select: standPartnerSelect,
    });
    if (!record) return null;

    const stats = await aggregateStandStats([id], brandId);
    return {
      ...mapStandPartner(record),
      stats: stats.get(id),
    };
  },

  // ------------------------------------------
  // CREATE
  // ------------------------------------------
  async createStandPartner(input: StandPartnerCreateInput): Promise<StandPartnerDTO> {
    const partner = await prisma.partner.findFirst({
      where: { id: input.partnerId, brandId: input.brandId },
      select: { id: true },
    });
    if (!partner) throw notFound("Partner not found for this brand");

    const created = await prisma.standPartner.create({
      data: {
        brandId: input.brandId,
        partnerId: input.partnerId,
        standType: input.standType ?? null,
        locationAddress: input.locationAddress ?? null,
        status: "ACTIVE",
      },
      select: standPartnerSelect,
    });

    logger.info(`[stand] Created stand partner ${created.id}`);
    return mapStandPartner(created);
  },

  // ------------------------------------------
  // UPDATE
  // ------------------------------------------
  async updateStandPartner(
    id: string,
    brandId: string,
    input: StandPartnerUpdateInput,
  ): Promise<StandPartnerDTO> {
    const existing = await prisma.standPartner.findFirst({ where: { id, brandId } });
    if (!existing) throw notFound("Stand partner not found");

    const updated = await prisma.standPartner.update({
      where: { id },
      data: {
        standType: input.standType ?? existing.standType,
        locationAddress: input.locationAddress ?? existing.locationAddress,
        status: input.status ?? existing.status,
      },
      select: standPartnerSelect,
    });

    logger.info(`[stand] Updated stand partner ${updated.id}`);
    return mapStandPartner(updated);
  },

  // ------------------------------------------
  // DEACTIVATE
  // ------------------------------------------
  async deactivateStandPartner(id: string, brandId: string): Promise<StandPartnerDTO> {
    const existing = await prisma.standPartner.findFirst({ where: { id, brandId } });
    if (!existing) throw notFound("Stand partner not found");

    const updated = await prisma.standPartner.update({
      where: { id },
      data: { status: "INACTIVE" },
      select: standPartnerSelect,
    });

    logger.info(`[stand] Deactivated stand partner ${updated.id}`);
    return mapStandPartner(updated);
  },

  // ------------------------------------------
  // STATS
  // ------------------------------------------
  async getStandPartnerStats(id: string, brandId: string): Promise<StandPartnerStatsDTO> {
    const record = await prisma.standPartner.findFirst({
      where: { id, brandId },
      select: { id: true },
    });
    if (!record) throw notFound("Stand partner not found");

    const stats = await aggregateStandStats([id], brandId);
    return (
      stats.get(id) ?? {
        standPartnerId: id,
        totalUnits: 0,
        totalOrders: 0,
        totalRevenue: 0,
        lastOrderAt: null,
      }
    );
  },
};
