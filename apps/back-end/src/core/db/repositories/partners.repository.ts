import type { Prisma } from "@prisma/client";
import { prisma } from "../../prisma.js";

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

const partnerMinimalSelect = {
  id: true,
  brandId: true,
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

export const partnersRepository = {
  listPartners(where: Prisma.PartnerWhereInput, skip: number, take: number) {
    return prisma.$transaction([
      prisma.partner.count({ where }),
      prisma.partner.findMany({
        where,
        select: partnerSelect,
        orderBy: { updatedAt: "desc" },
        skip,
        take,
      }),
    ]);
  },

  getPartnerById(partnerId: string, brandId: string) {
    return prisma.partner.findFirst({
      where: { id: partnerId, brandId },
      select: partnerSelect,
    });
  },

  getPartnerMinimal(partnerId: string, brandId: string) {
    return prisma.partner.findFirst({
      where: { id: partnerId, brandId },
      select: partnerMinimalSelect,
    });
  },

  createPartner(data: Prisma.PartnerCreateInput) {
    return prisma.partner.create({ data, select: partnerSelect });
  },

  updatePartner(partnerId: string, data: Prisma.PartnerUpdateInput) {
    return prisma.partner.update({
      where: { id: partnerId },
      data,
      select: partnerSelect,
    });
  },

  deactivatePartner(partnerId: string) {
    return prisma.partner.update({
      where: { id: partnerId },
      data: { status: "INACTIVE" },
      select: partnerSelect,
    });
  },

  getPartnerOverview(partnerId: string, brandId: string) {
    return prisma.$transaction([
      prisma.partnerContract.count({ where: { partnerId } }),
      prisma.partnerContract.findFirst({
        where: { partnerId },
        orderBy: { startDate: "desc" },
        select: { startDate: true, endDate: true },
      }),
      prisma.partnerPricing.count({ where: { partnerId } }),
      prisma.partnerOrder.aggregate({
        where: { partnerId, brandId },
        _count: { _all: true },
        _sum: { total: true },
      }),
    ]);
  },

  getPartnerStatsAggregates(partnerId: string, brandId: string) {
    return prisma.$transaction([
      prisma.partnerOrder.groupBy({
        by: ["partnerId"],
        where: { partnerId, brandId },
        orderBy: { partnerId: "asc" },
        _count: { _all: true },
        _sum: { total: true },
      }),
      prisma.partnerOrderItem.aggregate({
        where: {
          order: { partnerId, brandId },
        },
        _sum: { quantity: true },
      }),
      prisma.standPartner.count({
        where: { partnerId, brandId },
      }),
      prisma.whiteLabelOrder.aggregate({
        where: { wlBrand: { ownerPartnerId: partnerId } },
        _sum: { total: true },
      }),
      prisma.partnerOrder.findFirst({
        where: { partnerId, brandId },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
    ]);
  },

  countAffiliateLinksByBrand(brandId: string) {
    return prisma.affiliateLink.count({
      where: { affiliate: { brandId } },
    });
  },

  aggregateAffiliatePerformanceByBrand(brandId: string) {
    return prisma.affiliatePerformance.aggregate({
      where: { affiliate: { brandId } },
      _sum: { revenue: true },
    });
  },

  listPartnerContracts(where: Prisma.PartnerContractWhereInput, skip: number, take: number) {
    return prisma.$transaction([
      prisma.partnerContract.count({ where }),
      prisma.partnerContract.findMany({
        where,
        select: contractSelect,
        orderBy: { updatedAt: "desc" },
        skip,
        take,
      }),
    ]);
  },

  getPartnerContract(contractId: string, partnerId: string) {
    return prisma.partnerContract.findFirst({
      where: { id: contractId, partnerId },
      select: contractSelect,
    });
  },

  createPartnerContract(data: Prisma.PartnerContractCreateInput) {
    return prisma.partnerContract.create({ data, select: contractSelect });
  },

  updatePartnerContract(contractId: string, data: Prisma.PartnerContractUpdateInput) {
    return prisma.partnerContract.update({ where: { id: contractId }, data, select: contractSelect });
  },

  deletePartnerContract(contractId: string) {
    return prisma.partnerContract.delete({ where: { id: contractId } });
  },

  listPartnerPricing(where: Prisma.PartnerPricingWhereInput, skip: number, take: number) {
    return prisma.$transaction([
      prisma.partnerPricing.count({ where }),
      prisma.partnerPricing.findMany({
        where,
        select: pricingSelect,
        orderBy: { updatedAt: "desc" },
        skip,
        take,
      }),
    ]);
  },

  getPartnerPricing(partnerId: string, productId: string) {
    return prisma.partnerPricing.findFirst({
      where: { partnerId, productId },
      select: { id: true },
    });
  },

  createPartnerPricing(data: Prisma.PartnerPricingCreateInput) {
    return prisma.partnerPricing.create({ data, select: pricingSelect });
  },

  updatePartnerPricing(pricingId: string, data: Prisma.PartnerPricingUpdateInput) {
    return prisma.partnerPricing.update({ where: { id: pricingId }, data, select: pricingSelect });
  },

  listPartnerUsers(where: Prisma.PartnerUserWhereInput, skip: number, take: number) {
    return prisma.$transaction([
      prisma.partnerUser.count({ where }),
      prisma.partnerUser.findMany({
        where,
        include: partnerUserInclude,
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
    ]);
  },

  getPartnerUser(partnerUserId: string, partnerId: string) {
    return prisma.partnerUser.findFirst({
      where: { id: partnerUserId, partnerId },
      include: partnerUserInclude,
    });
  },

  getPartnerUserByPartnerAndUser(partnerId: string, userId: string) {
    return prisma.partnerUser.findFirst({
      where: { partnerId, userId },
    });
  },

  createPartnerUser(data: Prisma.PartnerUserCreateInput) {
    return prisma.partnerUser.create({ data, include: partnerUserInclude });
  },

  updatePartnerUser(partnerUserId: string, data: Prisma.PartnerUserUpdateInput) {
    return prisma.partnerUser.update({
      where: { id: partnerUserId },
      data,
      include: partnerUserInclude,
    });
  },

  deletePartnerUser(partnerUserId: string) {
    return prisma.partnerUser.delete({ where: { id: partnerUserId } });
  },

  getBrandById(brandId: string) {
    return prisma.brand.findUnique({ where: { id: brandId }, select: { id: true, defaultCurrency: true } });
  },

  getBrandCurrency(brandId: string) {
    return prisma.brand.findUnique({
      where: { id: brandId },
      select: { defaultCurrency: true },
    });
  },

  getProductForBrand(productId: string, brandId: string) {
    return prisma.brandProduct.findFirst({
      where: { id: productId, brandId },
      select: { id: true },
    });
  },

  getTierForBrand(tierId: string, brandId: string) {
    return prisma.partnerTier.findFirst({
      where: { id: tierId, brandId },
      select: { id: true },
    });
  },

  findPartnerByName(brandId: string, name: string, excludeId?: string) {
    const where: Prisma.PartnerWhereInput = {
      brandId,
      name: { equals: name, mode: "insensitive" },
    };
    if (excludeId) {
      where.id = { not: excludeId };
    }
    return prisma.partner.findFirst({
      where,
      select: { id: true },
    });
  },

  getUserById(userId: string) {
    return prisma.user.findUnique({ where: { id: userId } });
  },
};
