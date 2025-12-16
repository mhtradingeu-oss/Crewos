/**
 * DEALERS SERVICE — MH-OS v2
 * Spec: docs/os/20_partner-os.md (MASTER_INDEX)
 */
import type { Prisma } from "@prisma/client";
import { prisma } from "../../core/prisma.js";
import { buildPagination } from "../../core/utils/pagination.js";
import { badRequest, notFound } from "../../core/http/errors.js";
import { logger } from "../../core/logger.js";
import {
  DealerKpiDTO,
  DealerKpiListParams,
  DealerKpiListResponse,
  PartnerCreateInput,
  PartnerDTO,
  PartnerListParams,
  PartnerListResponse,
  PartnerStatsDTO,
  PartnerUpdateInput,
  DealersDashboardSummary,
} from "./dealers.types.js";
import {
  emitDealersCreated,
  emitDealersDeleted,
  emitDealersKpiUpdated,
  emitDealersUpdated,
} from "./dealers.events.js";

const partnerSelect = {
  id: true,
  brandId: true,
  type: true,
  name: true,
  country: true,
  city: true,
  status: true,
  tier: {
    select: {
      id: true,
      name: true,
      benefits: true,
    },
  },
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.PartnerSelect;

const dealerKpiSelect = {
  id: true,
  partnerId: true,
  brandId: true,
  totalOrders: true,
  totalRevenue: true,
  totalUnits: true,
  activeStands: true,
  engagementScore: true,
  lastOrderAt: true,
} satisfies Prisma.DealerKpiSelect;

function mapDealerKpi(
  record: Prisma.DealerKpiGetPayload<{ select: typeof dealerKpiSelect }>,
): DealerKpiDTO {
  return {
    partnerId: record.partnerId,
    brandId: record.brandId ?? undefined,
    totalOrders: record.totalOrders,
    totalRevenue: Number(record.totalRevenue ?? 0),
    totalUnits: record.totalUnits,
    activeStands: record.activeStands,
    engagementScore: record.engagementScore ?? undefined,
    lastOrderAt: record.lastOrderAt ?? undefined,
  };
}

function kpiToStats(kpi: DealerKpiDTO): PartnerStatsDTO {
  return {
    totalOrders: kpi.totalOrders,
    totalRevenue: kpi.totalRevenue,
    lastOrderAt: kpi.lastOrderAt ?? null,
    totalUnits: kpi.totalUnits,
    activeStands: kpi.activeStands,
    engagementScore: kpi.engagementScore,
  };
}

function mapPartner(
  record: Prisma.PartnerGetPayload<{ select: typeof partnerSelect }>,
): PartnerDTO {
  return {
    id: record.id,
    brandId: record.brandId ?? undefined,
    type: record.type,
    name: record.name,
    country: record.country,
    city: record.city,
    status: record.status ?? undefined,
    tier: record.tier
      ? {
          id: record.tier.id,
          name: record.tier.name,
          benefits: record.tier.benefits,
        }
      : null,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

async function buildDealerKpiData(partnerId: string, brandId: string) {
  const [orderAgg, unitsAgg, activeStands] = await Promise.all([
    prisma.partnerOrder.aggregate({
      where: { partnerId, brandId },
      _count: { id: true },
      _sum: { total: true },
      _max: { createdAt: true },
    }),
    prisma.partnerOrderItem.aggregate({
      where: { order: { partnerId, brandId } },
      _sum: { quantity: true },
    }),
    prisma.stand.count({
      where: {
        brandId,
        standPartner: {
          partnerId,
        },
        status: "ACTIVE",
      },
    }),
  ]);

  const totalOrders = orderAgg._count.id ?? 0;
  const totalRevenue = Number(orderAgg._sum.total ?? 0);
  const totalUnits = unitsAgg._sum.quantity ?? 0;
  const lastOrderAt = orderAgg._max.createdAt ?? null;
  const engagementScore = Math.min(
    100,
    totalOrders * 2 + totalRevenue / 1000 + activeStands * 3,
  );

  return {
    totalOrders,
    totalRevenue,
    totalUnits,
    activeStands,
    engagementScore,
    lastOrderAt,
  };
}

export const dealersService = {
  async getDashboardSummary(brandId: string): Promise<DealersDashboardSummary> {
    const [totalPartners, activePartners, ordersAgg, totalStands, topCountries] =
      await prisma.$transaction([
        prisma.partner.count({ where: { brandId } }),
        prisma.partner.count({ where: { brandId, status: "ACTIVE" } }),
        prisma.partnerOrder.aggregate({
          where: { brandId },
          _count: { id: true },
          _sum: { total: true },
        }),
        prisma.stand.count({ where: { brandId } }),
        prisma.partner.groupBy({
          by: ["country"],
          where: { brandId, country: { not: null } },
          _count: { id: true },
          orderBy: { _count: { id: "desc" } },
          take: 3,
        }),
      ]);

    return {
      totalPartners,
      activePartners,
      totalOrders: ordersAgg._count.id ?? 0,
      totalRevenue: Number(ordersAgg._sum.total ?? 0),
      totalStands,
      topCountries: topCountries.map((row: any) => ({
        country: row.country ?? "unknown",
        partners: typeof row._count === "object" && row._count ? row._count.id ?? 0 : 0,
      })),
    };
  },

  async listPartners(params: PartnerListParams): Promise<PartnerListResponse> {
    const { brandId, search, active, tierId } = params;
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(params.pageSize ?? 20, 100);
    const { skip, take } = buildPagination({ page, pageSize });
    const where: Prisma.PartnerWhereInput = { brandId };

    if (active !== undefined) {
      where.status = active ? "ACTIVE" : { not: "ACTIVE" };
    }
    if (tierId) where.tierId = tierId;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { country: { contains: search, mode: "insensitive" } },
      ];
    }

    const [total, rows] = await prisma.$transaction([
      prisma.partner.count({ where }),
      prisma.partner.findMany({
        where,
        select: partnerSelect,
        orderBy: { updatedAt: "desc" },
        skip,
        take,
      }),
    ]);

    return {
      items: rows.map((item: any) => mapPartner(item)),
      total,
      page,
      pageSize: take,
    };
  },

  async getPartnerById(partnerId: string, brandId: string): Promise<PartnerDTO | null> {
    const record = await prisma.partner.findFirst({
      where: { id: partnerId, brandId },
      select: partnerSelect,
    });
    if (!record) return null;
    const dto = mapPartner(record);
    const kpi = await this.getDealerKpi(partnerId, brandId);
    return { ...dto, stats: kpiToStats(kpi) };
  },

  async createPartner(input: PartnerCreateInput): Promise<PartnerDTO> {
    const existing = await prisma.partner.findFirst({
      where: { brandId: input.brandId, name: input.name },
    });
    if (existing) {
      throw badRequest("Partner with this name already exists");
    }

    const created = await prisma.partner.create({
      data: {
        brandId: input.brandId,
        type: input.type,
        name: input.name,
        country: input.country ?? null,
        city: input.city ?? null,
        tierId: input.tierId ?? null,
        settingsJson:
          typeof input.settingsJson === "string"
            ? input.settingsJson
            : JSON.stringify(input.settingsJson ?? {}),
        status: input.status ?? "ACTIVE",
      },
      select: partnerSelect,
    });

    logger.info(`[partners] Created partner ${created.name} for brand ${input.brandId}`);
    await emitDealersCreated({
      brandId: created.brandId ?? undefined,
      partnerId: created.id,
      action: "created",
    });
    return mapPartner(created);
  },

  async updatePartner(
    partnerId: string,
    brandId: string,
    input: PartnerUpdateInput,
  ): Promise<PartnerDTO> {
    const existing = await prisma.partner.findFirst({ where: { id: partnerId, brandId } });
    if (!existing) throw notFound("Partner not found");

    const updated = await prisma.partner.update({
      where: { id: partnerId },
      data: {
        type: input.type ?? undefined,
        name: input.name ?? undefined,
        country: input.country ?? undefined,
        city: input.city ?? undefined,
        tierId: input.tierId ?? undefined,
        settingsJson:
          input.settingsJson !== undefined
            ? typeof input.settingsJson === "string"
              ? input.settingsJson
              : JSON.stringify(input.settingsJson)
            : existing.settingsJson,
        status: input.status ?? existing.status,
      },
      select: partnerSelect,
    });

    logger.info(`[partners] Updated partner ${updated.id}`);
    await emitDealersUpdated({
      brandId: updated.brandId ?? undefined,
      partnerId: updated.id,
      action: "updated",
    });
    return mapPartner(updated);
  },

  async deactivatePartner(partnerId: string, brandId: string): Promise<PartnerDTO> {
    const existing = await prisma.partner.findFirst({ where: { id: partnerId, brandId } });
    if (!existing) throw notFound("Partner not found");

    const updated = await prisma.partner.update({
      where: { id: partnerId },
      data: { status: "INACTIVE" },
      select: partnerSelect,
    });

    logger.info(`[partners] Deactivated partner ${partnerId}`);
    await emitDealersDeleted({
      brandId: updated.brandId ?? undefined,
      partnerId: updated.id,
      action: "deleted",
    });
    return mapPartner(updated);
  },

  async getPartnerStats(partnerId: string, brandId: string): Promise<PartnerStatsDTO> {
    const kpi = await this.getDealerKpi(partnerId, brandId);
    return kpiToStats(kpi);
  },

  async getDealerKpi(partnerId: string, brandId: string): Promise<DealerKpiDTO> {
    if (!brandId) throw badRequest("brandId is required");
    const record = await prisma.dealerKpi.findUnique({
      where: { partnerId_brandId: { partnerId, brandId } },
      select: dealerKpiSelect,
    });
    if (record) return mapDealerKpi(record);
    return this.recalculateDealerKpi(partnerId, brandId);
  },

  async listDealerKpis(params: DealerKpiListParams): Promise<DealerKpiListResponse> {
    const { brandId } = params;
    if (!brandId) throw badRequest("brandId is required");
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(params.pageSize ?? 20, 100);
    const { skip, take } = buildPagination({ page, pageSize });
    const where: Prisma.DealerKpiWhereInput = { brandId };
    const [total, rows] = await prisma.$transaction([
      prisma.dealerKpi.count({ where }),
      prisma.dealerKpi.findMany({
        where,
        include: { partner: { select: { name: true } } },
        orderBy: { updatedAt: "desc" },
        skip,
        take,
      }),
    ]);
    return {
      items: rows.map((record: any) => ({
        ...mapDealerKpi(record),
        partnerName: record.partner?.name ?? undefined,
      })),
      total,
      page,
      pageSize: take,
    };
  },

  async recalculateDealerKpi(partnerId: string, brandId: string): Promise<DealerKpiDTO> {
    if (!brandId) throw badRequest("brandId is required");
    const kpiData = await buildDealerKpiData(partnerId, brandId);
    const partner = await prisma.partner.findUnique({
      where: { id: partnerId },
      select: { name: true },
    });
    const record = await prisma.dealerKpi.upsert({
      where: { partnerId_brandId: { partnerId, brandId } },
      create: {
        partnerId,
        brandId,
        totalOrders: kpiData.totalOrders,
        totalRevenue: kpiData.totalRevenue,
        totalUnits: kpiData.totalUnits,
        activeStands: kpiData.activeStands,
        engagementScore: kpiData.engagementScore,
        lastOrderAt: kpiData.lastOrderAt,
      },
      update: {
        totalOrders: kpiData.totalOrders,
        totalRevenue: kpiData.totalRevenue,
        totalUnits: kpiData.totalUnits,
        activeStands: kpiData.activeStands,
        engagementScore: kpiData.engagementScore,
        lastOrderAt: kpiData.lastOrderAt,
      },
      select: dealerKpiSelect,
    });
    const dto = mapDealerKpi(record);
    await emitDealersKpiUpdated(
      {
        ...dto,
        partnerName: partner?.name ?? undefined,
      },
      {
        brandId,
        module: "dealers",
        source: "api",
      },
    );
    return dto;
  },
};
