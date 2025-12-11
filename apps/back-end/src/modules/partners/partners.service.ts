import type { Prisma } from "@prisma/client";
import { prisma } from "../../core/prisma.js";
import { buildPagination } from "../../core/utils/pagination.js";
import { badRequest, notFound } from "../../core/http/errors.js";
import { logger } from "../../core/logger.js";
import { usersService } from "../users/users.service.js";
import type {
  CreatePartnerInput,
  CreatePartnerUserInput,
  PartnerContractCreateInput,
  PartnerContractDTO,
  PartnerContractListParams,
  PartnerContractListResponse,
  PartnerContractUpdateInput,
  PartnerDTO,
  PartnerDetailDTO,
  PartnerListParams,
  PartnerPricingDTO,
  PartnerPricingListParams,
  PartnerPricingListResponse,
  PartnerPricingUpsertInput,
  PartnerStatsDTO,
  PartnerUserRecord,
  PaginatedPartners,
  PaginatedPartnerUsers,
  PartnerUserListParams,
  PartnerUserRole,
  UpdatePartnerInput,
  UpdatePartnerUserInput,
} from "./partners.types.js";
import {
  emitPartnersCreated,
  emitPartnersDeleted,
  emitPartnersUpdated,
} from "./partners.events.js";

const partnerSelect = {
  id: true,
  brandId: true,
  type: true,
  name: true,
  country: true,
  city: true,
  status: true,
  tierId: true,
  tier: { select: { id: true, name: true } },
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.PartnerSelect;

const partnerUserInclude = {
  user: {
    select: {
      id: true,
      email: true,
    },
  },
} satisfies Prisma.PartnerUserInclude;

const contractSelect = {
  id: true,
  partnerId: true,
  startDate: true,
  endDate: true,
  termsJson: true,
  createdAt: true,
  updatedAt: true,
  partner: { select: { brandId: true } },
} satisfies Prisma.PartnerContractSelect;

const pricingSelect = {
  id: true,
  partnerId: true,
  productId: true,
  netPrice: true,
  currency: true,
  createdAt: true,
  updatedAt: true,
  product: { select: { name: true } },
} satisfies Prisma.PartnerPricingSelect;

class PartnerService {
  constructor(private readonly db = prisma) {}

  async list(params: PartnerListParams): Promise<PaginatedPartners> {
    const { brandId, search, tierId, status, page = 1, pageSize = 20 } = params;
    const { skip, take } = buildPagination({ page, pageSize });
    const where: Prisma.PartnerWhereInput = { brandId };
    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }
    if (tierId) where.tierId = tierId;
    if (status) where.status = status;

    const [total, rows] = await this.db.$transaction([
      this.db.partner.count({ where }),
      this.db.partner.findMany({
        where,
        select: partnerSelect,
        orderBy: { updatedAt: "desc" },
        skip,
        take,
      }),
    ]);

    return {
      data: rows.map((row) => this.mapPartner(row)),
      total,
      page,
      pageSize: take,
    };
  }

  async listPartnerContracts(params: PartnerContractListParams): Promise<PartnerContractListResponse> {
    await this.ensurePartner(params.partnerId, params.brandId);
    const { partnerId, page = 1, pageSize = 20, onlyActive } = params;
    const { skip, take } = buildPagination({ page, pageSize });

    const where: Prisma.PartnerContractWhereInput = { partnerId };
    if (onlyActive) {
      const now = new Date();
      where.OR = [{ endDate: null }, { endDate: { gte: now } }];
    }

    const [total, rows] = await this.db.$transaction([
      this.db.partnerContract.count({ where }),
      this.db.partnerContract.findMany({
        where,
        select: contractSelect,
        orderBy: { updatedAt: "desc" },
        skip,
        take,
      }),
    ]);

    return {
      data: rows.map((row) => this.mapPartnerContract(row)),
      total,
      page,
      pageSize: take,
    };
  }

  async getPartnerContract(contractId: string, partnerId: string, brandId: string): Promise<PartnerContractDTO> {
    await this.ensurePartner(partnerId, brandId);
    const contract = await this.db.partnerContract.findFirst({
      where: { id: contractId, partnerId },
      select: contractSelect,
    });
    if (!contract) throw notFound("Contract not found");
    return this.mapPartnerContract(contract);
  }

  async createPartnerContract(input: PartnerContractCreateInput): Promise<PartnerContractDTO> {
    await this.ensurePartner(input.partnerId, input.brandId);
    const serializedTerms = this.serializeTerms(input.terms);
    const created = await this.db.partnerContract.create({
      data: {
        partnerId: input.partnerId,
        startDate: input.startDate ? new Date(input.startDate) : null,
        endDate: input.endDate ? new Date(input.endDate) : null,
        termsJson: serializedTerms,
      },
      select: contractSelect,
    });
    logger.info(`[partners] Created contract ${created.id} for partner ${input.partnerId}`);
    return this.mapPartnerContract(created);
  }

  async updatePartnerContract(
    contractId: string,
    partnerId: string,
    brandId: string,
    input: PartnerContractUpdateInput,
  ): Promise<PartnerContractDTO> {
    await this.ensurePartner(partnerId, brandId);
    const contract = await this.db.partnerContract.findFirst({
      where: { id: contractId, partnerId },
      select: { id: true },
    });
    if (!contract) throw notFound("Contract not found");

    const serializedTerms = this.serializeTerms(input.terms);
    const updated = await this.db.partnerContract.update({
      where: { id: contractId },
      data: {
        startDate: input.startDate ? new Date(input.startDate) : undefined,
        endDate: input.endDate ? new Date(input.endDate) : undefined,
        termsJson: serializedTerms ?? undefined,
      },
      select: contractSelect,
    });

    logger.info(`[partners] Updated contract ${updated.id} for partner ${partnerId}`);
    return this.mapPartnerContract(updated);
  }

  async removePartnerContract(contractId: string, partnerId: string, brandId: string) {
    await this.ensurePartner(partnerId, brandId);
    const contract = await this.db.partnerContract.findFirst({
      where: { id: contractId, partnerId },
      select: { id: true },
    });
    if (!contract) throw notFound("Contract not found");

    await this.db.partnerContract.delete({ where: { id: contractId } });
    logger.info(`[partners] Removed contract ${contractId} for partner ${partnerId}`);
    return { id: contractId };
  }

  async listPartnerPricing(params: PartnerPricingListParams): Promise<PartnerPricingListResponse> {
    await this.ensurePartner(params.partnerId, params.brandId);
    const { partnerId, productId, page = 1, pageSize = 20 } = params;
    const { skip, take } = buildPagination({ page, pageSize });

    const where: Prisma.PartnerPricingWhereInput = { partnerId };
    if (productId) where.productId = productId;

    const [total, rows] = await this.db.$transaction([
      this.db.partnerPricing.count({ where }),
      this.db.partnerPricing.findMany({
        where,
        select: pricingSelect,
        orderBy: { updatedAt: "desc" },
        skip,
        take,
      }),
    ]);

    return {
      data: rows.map((row) => this.mapPartnerPricing(row)),
      total,
      page,
      pageSize: take,
    };
  }

  async upsertPartnerPricing(input: PartnerPricingUpsertInput): Promise<PartnerPricingDTO> {
    await this.ensurePartner(input.partnerId, input.brandId);
    const product = await this.db.brandProduct.findFirst({
      where: { id: input.productId, brandId: input.brandId },
      select: { id: true },
    });
    if (!product) throw notFound("Product not found for this brand");

    const currency = input.currency ?? (await this.getBrandCurrency(input.brandId)) ?? undefined;

    const existing = await this.db.partnerPricing.findFirst({
      where: { partnerId: input.partnerId, productId: input.productId },
      select: { id: true },
    });

    const data = {
      partnerId: input.partnerId,
      productId: input.productId,
      netPrice: input.netPrice,
      currency: currency ?? null,
    };

    const result =
      existing !== null
        ? await this.db.partnerPricing.update({
            where: { id: existing.id },
            data,
            select: pricingSelect,
          })
        : await this.db.partnerPricing.create({
            data,
            select: pricingSelect,
          });

    logger.info(
      `[partners] Upserted pricing (${result.id}) for partner ${input.partnerId} / product ${input.productId}`,
    );
    return this.mapPartnerPricing(result);
  }

  async getById(id: string, brandId: string): Promise<PartnerDetailDTO> {
    const partner = await this.db.partner.findFirst({
      where: { id, brandId },
      select: partnerSelect,
    });
    if (!partner) {
      throw notFound("Partner not found");
    }

    const [contractCount, latestContract, pricingCount, orderAggregate] = await this.db.$transaction([
      this.db.partnerContract.count({ where: { partnerId: id } }),
      this.db.partnerContract.findFirst({
        where: { partnerId: id },
        orderBy: { startDate: "desc" },
        select: { startDate: true, endDate: true },
      }),
      this.db.partnerPricing.count({ where: { partnerId: id } }),
      this.db.partnerOrder.aggregate({
        where: { partnerId: id, brandId },
        _count: { _all: true },
        _sum: { total: true },
      }),
    ]);

    return {
      ...this.mapPartner(partner),
      contractsCount: contractCount,
      latestContract: latestContract
        ? { startDate: latestContract.startDate ?? undefined, endDate: latestContract.endDate ?? undefined }
        : undefined,
      pricingCount,
      totalOrders: orderAggregate._count._all ?? 0,
      totalRevenue: this.toNumber(orderAggregate._sum.total),
    };
  }

  async create(input: CreatePartnerInput): Promise<PartnerDTO> {
    await this.ensureBrandExists(input.brandId);
    if (input.tierId) await this.ensureTierBelongs(input.tierId, input.brandId);
    await this.ensureNameUnique(input.brandId, input.name);

    const normalizedCountry = this.normalizeLocation(input.country);
    const normalizedCity = this.normalizeLocation(input.city);

    const created = await this.db.partner.create({
      data: {
        brandId: input.brandId,
        type: input.type,
        name: input.name,
        country: normalizedCountry,
        city: normalizedCity,
        tierId: input.tierId ?? null,
        status: input.status ?? "ACTIVE",
      },
      select: partnerSelect,
    });

    logger.info(`[partners] Created ${created.name} (${created.id}) for brand ${created.brandId}`);
    await emitPartnersCreated({ id: created.id });
    return this.mapPartner(created);
  }

  async update(id: string, brandId: string, input: UpdatePartnerInput): Promise<PartnerDTO> {
    const existing = await this.db.partner.findFirst({
      where: { id, brandId },
      select: partnerSelect,
    });
    if (!existing) throw notFound("Partner not found");

    if (input.tierId && input.tierId !== existing.tierId) {
      await this.ensureTierBelongs(input.tierId, brandId);
    }

    if (input.name && input.name !== existing.name) {
      await this.ensureNameUnique(brandId, input.name, id);
    }

    const normalizedCountry = this.normalizeLocation(input.country ?? existing.country);
    const normalizedCity = this.normalizeLocation(input.city ?? existing.city);

    const updated = await this.db.partner.update({
      where: { id },
      data: {
        type: input.type ?? existing.type,
        name: input.name ?? existing.name,
        country: normalizedCountry,
        city: normalizedCity,
        tierId: input.tierId ?? existing.tierId,
        status: input.status ?? existing.status,
      },
      select: partnerSelect,
    });

    logger.info(`[partners] Updated ${updated.name} (${updated.id})`);
    await emitPartnersUpdated({ id: updated.id });
    return this.mapPartner(updated);
  }

  async deactivate(id: string, brandId: string) {
    const existing = await this.db.partner.findFirst({
      where: { id, brandId },
      select: { id: true, name: true },
    });
    if (!existing) throw notFound("Partner not found");

    await this.db.partner.update({
      where: { id },
      data: { status: "INACTIVE" },
    });

    logger.info(`[partners] Deactivated ${existing.name} (${existing.id})`);
    await emitPartnersDeleted({ id: existing.id });
    return { id: existing.id };
  }

  async getStats(partnerId: string, brandId: string): Promise<PartnerStatsDTO> {
    const partner = await this.db.partner.findFirst({
      where: { id: partnerId, brandId },
      select: partnerSelect,
    });
    if (!partner) throw notFound("Partner not found");

    const [
      orderGroups,
      orderItemsAgg,
      standCount,
      whiteLabelRevenueAgg,
      lastOrder,
    ] = await this.db.$transaction([
      this.db.partnerOrder.groupBy({
        by: ["partnerId"],
        where: { partnerId, brandId },
        orderBy: { partnerId: "asc" },
        _count: { _all: true },
        _sum: { total: true },
      }),
      this.db.partnerOrderItem.aggregate({
        where: {
          order: { partnerId, brandId },
        },
        _sum: { quantity: true },
      }),
      this.db.standPartner.count({
        where: { partnerId, brandId },
      }),
      this.db.whiteLabelOrder.aggregate({
        where: { wlBrand: { ownerPartnerId: partnerId } },
        _sum: { total: true },
      }),
      this.db.partnerOrder.findFirst({
        where: { partnerId, brandId },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
    ]);

    const affiliateLinkCount = partner.brandId
      ? await this.db.affiliateLink.count({
          where: { affiliate: { brandId: partner.brandId } },
        })
      : 0;

    const affiliateRevenueAgg = partner.brandId
      ? await this.db.affiliatePerformance.aggregate({
          where: { affiliate: { brandId: partner.brandId } },
          _sum: { revenue: true },
        })
      : { _sum: { revenue: null } };

    const orderMetrics = orderGroups[0];
    const countMetrics = orderMetrics?._count;
    const sumMetrics = orderMetrics?._sum;
    const totalOrders =
      typeof countMetrics === "object" && countMetrics !== null
        ? countMetrics._all ?? 0
        : 0;
    const totalRevenue =
      typeof sumMetrics === "object" && sumMetrics !== null
        ? this.toNumber(sumMetrics.total)
        : 0;
    const totalProducts = orderItemsAgg._sum.quantity ?? 0;
    const whiteLabelRevenue = this.toNumber(whiteLabelRevenueAgg._sum.total);
    const affiliateRevenue = this.toNumber(affiliateRevenueAgg._sum.revenue);

    return {
      totalOrders,
      totalRevenue,
      totalProducts,
      totalStands: standCount,
      affiliateLinks: affiliateLinkCount,
      affiliateRevenue,
      whiteLabelRevenue,
      lastOrderAt: lastOrder?.createdAt ?? undefined,
    };
  }

  async listPartnerUsers(params: PartnerUserListParams): Promise<PaginatedPartnerUsers> {
    const { partnerId, brandId, page = 1, pageSize = 20 } = params;
    const partner = await this.db.partner.findFirst({
      where: { id: partnerId, brandId },
      select: { id: true },
    });
    if (!partner) throw notFound("Partner not found");

    const { skip, take } = buildPagination({ page, pageSize });
    const where: Prisma.PartnerUserWhereInput = { partnerId };

    const [total, rows] = await this.db.$transaction([
      this.db.partnerUser.count({ where }),
      this.db.partnerUser.findMany({
        where,
        include: partnerUserInclude,
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
    ]);

    return {
      data: rows.map((row) => this.mapPartnerUser(row)),
      total,
      page,
      pageSize: take,
    };
  }

  async createPartnerUser(
    partnerId: string,
    brandId: string,
    input: CreatePartnerUserInput,
  ): Promise<PartnerUserRecord> {
    await this.ensurePartner(partnerId, brandId);
    const role = input.role ?? ("PARTNER_USER" as PartnerUserRole);
    let userId = input.userId;

    if (!userId) {
      if (!input.email || !input.password) {
        throw badRequest("email and password are required when creating a new user");
      }
      const user = await usersService.create({
        email: input.email,
        password: input.password,
        role,
      });
      userId = user.id;
    } else {
      const existingUser = await this.db.user.findUnique({ where: { id: userId } });
      if (!existingUser) throw notFound("User not found");
    }

    const alreadyLinked = await this.db.partnerUser.findFirst({
      where: { partnerId, userId },
    });
    if (alreadyLinked) {
      throw badRequest("User already assigned to this partner");
    }

    const created = await this.db.partnerUser.create({
      data: { partnerId, userId, role },
      include: partnerUserInclude,
    });

    logger.info(`[partners] Linked user ${userId} to partner ${partnerId}`);
    return this.mapPartnerUser(created);
  }

  async updatePartnerUser(
    partnerId: string,
    brandId: string,
    partnerUserId: string,
    input: UpdatePartnerUserInput,
  ): Promise<PartnerUserRecord> {
    await this.ensurePartner(partnerId, brandId);
    const existing = await this.db.partnerUser.findFirst({
      where: { id: partnerUserId, partnerId },
      include: partnerUserInclude,
    });
    if (!existing) throw notFound("Partner user not found");

    const updated = await this.db.partnerUser.update({
      where: { id: partnerUserId },
      data: {
        role: input.role ?? existing.role,
      },
      include: partnerUserInclude,
    });

    logger.info(`[partners] Updated partner user ${partnerUserId} (${updated.role})`);
    return this.mapPartnerUser(updated);
  }

  async deactivatePartnerUser(
    partnerId: string,
    brandId: string,
    partnerUserId: string,
  ) {
    await this.ensurePartner(partnerId, brandId);
    const existing = await this.db.partnerUser.findFirst({
      where: { id: partnerUserId, partnerId },
    });
    if (!existing) throw notFound("Partner user not found");

    await this.db.partnerUser.delete({ where: { id: partnerUserId } });
    logger.info(`[partners] Removed partner user ${partnerUserId} from ${partnerId}`);
    return { id: partnerUserId };
  }

  private mapPartner(
    row: Prisma.PartnerGetPayload<{ select: typeof partnerSelect }>,
  ): PartnerDTO {
    return {
      id: row.id,
      brandId: row.brandId ?? undefined,
      type: row.type,
      name: row.name,
      country: row.country ?? undefined,
      city: row.city ?? undefined,
      status: row.status ?? undefined,
      tierId: row.tierId ?? undefined,
      tierName: row.tier?.name ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private mapPartnerUser(
    row: Prisma.PartnerUserGetPayload<{ include: typeof partnerUserInclude }>,
  ): PartnerUserRecord {
    return {
      id: row.id,
      partnerId: row.partnerId,
      userId: row.userId ?? undefined,
      role: row.role as PartnerUserRole | undefined,
      userEmail: row.user?.email ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private normalizeLocation(value?: string | null) {
    if (!value) return null;
    const cleaned = value.trim().replace(/\s+/g, " ");
    return cleaned || null;
  }

  private toNumber(value?: Prisma.Decimal | null) {
    return Number(value?.toString() ?? 0);
  }

  private async ensureBrandExists(brandId: string) {
    const exists = await this.db.brand.findUnique({ where: { id: brandId }, select: { id: true } });
    if (!exists) throw badRequest("Brand not found");
  }

  private async getBrandCurrency(brandId: string) {
    const brand = await this.db.brand.findUnique({
      where: { id: brandId },
      select: { defaultCurrency: true },
    });
    return brand?.defaultCurrency ?? null;
  }

  private mapPartnerContract(
    row: Prisma.PartnerContractGetPayload<{ select: typeof contractSelect }>,
  ): PartnerContractDTO {
    return {
      id: row.id,
      partnerId: row.partnerId,
      startDate: row.startDate ?? undefined,
      endDate: row.endDate ?? undefined,
      brandId: row.partner?.brandId ?? undefined,
      terms: this.parseTerms(row.termsJson),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private mapPartnerPricing(
    row: Prisma.PartnerPricingGetPayload<{ select: typeof pricingSelect }>,
  ): PartnerPricingDTO {
    return {
      id: row.id,
      partnerId: row.partnerId,
      productId: row.productId,
      productName: row.product?.name ?? undefined,
      netPrice: row.netPrice ? Number(row.netPrice.toString()) : undefined,
      currency: row.currency ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private serializeTerms(value?: Record<string, unknown> | string | null): string | null {
    if (!value) return null;
    if (typeof value === "string") return value;
    return JSON.stringify(value);
  }

  private parseTerms(value?: string | null): Record<string, unknown> | string | undefined {
    if (!value) return undefined;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  private async ensureTierBelongs(tierId: string, brandId: string) {
    const tier = await this.db.partnerTier.findFirst({
      where: { id: tierId, brandId },
      select: { id: true },
    });
    if (!tier) throw badRequest("Tier not found for this brand");
  }

  private async ensureNameUnique(brandId: string, name: string, excludeId?: string) {
    const where: Prisma.PartnerWhereInput = {
      brandId,
      name: { equals: name, mode: "insensitive" },
    };
    if (excludeId) where.id = { not: excludeId };
    const existing = await this.db.partner.findFirst({ where, select: { id: true } });
    if (existing) throw badRequest("Partner name already in use for this brand");
  }

  private async ensurePartner(partnerId: string, brandId: string) {
    const partner = await this.db.partner.findFirst({
      where: { id: partnerId, brandId },
      select: { id: true, brandId: true },
    });
    if (!partner) throw notFound("Partner not found");
    return partner;
  }
}

export const partnersService = new PartnerService();
