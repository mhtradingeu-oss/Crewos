import type { Prisma } from "@prisma/client";
import { prisma } from "../../core/prisma.js";
import { buildPagination } from "../../core/utils/pagination.js";
import { badRequest, notFound } from "../../core/http/errors.js";
import { logger } from "../../core/logger.js";
import {
  emitWhiteLabelOrderCreated,
  emitWhiteLabelOrderStatusChanged,
  emitWhiteLabelPricingSyncRequested,
} from "./white-label.events.js";
import type {
  CreateWLBrandInput,
  CreateWLOrderInput,
  CreateWLProductInput,
  PricingSyncRequestInput,
  UpdateWLBrandInput,
  UpdateWLOrderStatusInput,
  WLBrandListParams,
  WLBrandListResponse,
  WLBrandStatsDTO,
  WLProductListParams,
  WLProductListResponse,
  WhiteLabelBrandDTO,
  WhiteLabelBrandDetailDTO,
  WhiteLabelOrderDTO,
  WhiteLabelProductDTO,
} from "./white-label.types.js";

const brandSelect = {
  id: true,
  brandId: true,
  ownerPartnerId: true,
  ownerAffiliateId: true,
  name: true,
  slug: true,
  status: true,
  settingsJson: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.WhiteLabelBrandSelect;

const productSelect = {
  id: true,
  wlBrandId: true,
  baseProductId: true,
  name: true,
  sku: true,
  pricingRecords: {
    take: 1,
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      pricingJson: true,
      createdAt: true,
      updatedAt: true,
    },
  },
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.WhiteLabelProductSelect;

const orderSelect = {
  id: true,
  wlBrandId: true,
  status: true,
  total: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.WhiteLabelOrderSelect;

function parseSettings(value: string | null) {
  if (!value) return undefined;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function mapBrand(record: Prisma.WhiteLabelBrandGetPayload<{ select: typeof brandSelect }>): WhiteLabelBrandDTO {
  return {
    id: record.id,
    brandId: record.brandId ?? undefined,
    ownerPartnerId: record.ownerPartnerId ?? undefined,
    ownerAffiliateId: record.ownerAffiliateId ?? undefined,
    name: record.name,
    slug: record.slug,
    status: record.status ?? undefined,
    settings: parseSettings(record.settingsJson),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function mapProduct(record: Prisma.WhiteLabelProductGetPayload<{ select: typeof productSelect }>): WhiteLabelProductDTO {
  return {
    id: record.id,
    wlBrandId: record.wlBrandId,
    baseProductId: record.baseProductId ?? undefined,
    name: record.name,
    sku: record.sku ?? undefined,
    pricing:
      record.pricingRecords?.[0] != null
        ? {
            id: record.pricingRecords[0].id,
            pricing: parseSettings(record.pricingRecords[0].pricingJson),
            createdAt: record.pricingRecords[0].createdAt,
            updatedAt: record.pricingRecords[0].updatedAt,
          }
        : undefined,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function mapOrder(record: Prisma.WhiteLabelOrderGetPayload<{ select: typeof orderSelect }>): WhiteLabelOrderDTO {
  return {
    id: record.id,
    wlBrandId: record.wlBrandId,
    status: record.status ?? undefined,
    total: record.total ? Number(record.total) : 0,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function buildStats(
  brandId: string,
  productCounts: Record<string, number>,
  orderCounts: Record<string, number>,
  revenueTotals: Record<string, number>,
): WLBrandStatsDTO {
  return {
    brandId,
    productsCount: productCounts[brandId] ?? 0,
    ordersCount: orderCounts[brandId] ?? 0,
    totalRevenue: revenueTotals[brandId] ?? 0,
  };
}

async function ensureWLBrandOwnership(wlBrandId: string, brandId: string) {
  const brand = await prisma.whiteLabelBrand.findFirst({
    where: { id: wlBrandId, brandId },
    select: { id: true, brandId: true },
  });
  if (!brand) {
    throw notFound("White-label brand not found");
  }
  return brand;
}

export const white_labelService = {
  async listWLBrands(params: WLBrandListParams): Promise<WLBrandListResponse> {
    if (!params.brandId) {
      throw badRequest("brandId is required");
    }

    const { page = 1, pageSize = 20 } = params;
    const { skip, take } = buildPagination({ page, pageSize });

    const where: Prisma.WhiteLabelBrandWhereInput = { brandId: params.brandId };
    if (params.ownerPartnerId) where.ownerPartnerId = params.ownerPartnerId;
    if (params.ownerAffiliateId) where.ownerAffiliateId = params.ownerAffiliateId;
    if (params.status) where.status = params.status;
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: "insensitive" } },
        { slug: { contains: params.search, mode: "insensitive" } },
      ];
    }

    const [total, rows] = await prisma.$transaction([
      prisma.whiteLabelBrand.count({ where }),
      prisma.whiteLabelBrand.findMany({
        where,
        select: brandSelect,
        orderBy: { updatedAt: "desc" },
        skip,
        take,
      }),
    ]);

    const brandIds = rows.map((row) => row.id);
    const productCountMap: Record<string, number> = {};
    const orderCountMap: Record<string, number> = {};
    const revenueMap: Record<string, number> = {};

    if (brandIds.length) {
      const [pc, om] = await prisma.$transaction([
        prisma.whiteLabelProduct.groupBy({
          by: ["wlBrandId"],
          where: { wlBrandId: { in: brandIds } },
          orderBy: { wlBrandId: "asc" },
          _count: { _all: true },
        }),
        prisma.whiteLabelOrder.groupBy({
          by: ["wlBrandId"],
          where: { wlBrandId: { in: brandIds } },
          orderBy: { wlBrandId: "asc" },
          _count: { _all: true },
          _sum: { total: true },
        }),
      ]);

      for (const item of pc) {
        const count =
          typeof item._count === "object" && item._count?._all != null
            ? item._count._all
            : 0;
        productCountMap[item.wlBrandId] = count;
      }

      for (const entry of om) {
        const count =
          typeof entry._count === "object" && entry._count?._all != null
            ? entry._count._all
            : 0;
        orderCountMap[entry.wlBrandId] = count;
        const sumTotal =
          typeof entry._sum === "object" && entry._sum?.total != null
            ? Number(entry._sum.total)
            : 0;
        revenueMap[entry.wlBrandId] = sumTotal;
      }
    }

    return {
      items: rows.map((row) => ({
        ...mapBrand(row),
        stats: buildStats(row.id, productCountMap, orderCountMap, revenueMap),
      })),
      total,
      page,
      pageSize: take,
    };
  },

  async getWLBrand(id: string, brandId: string): Promise<WhiteLabelBrandDetailDTO> {
    await ensureWLBrandOwnership(id, brandId);
    const record = await prisma.whiteLabelBrand.findFirst({
      where: { id, brandId },
      select: {
        ...brandSelect,
        products: {
          select: productSelect,
          orderBy: { createdAt: "desc" },
        },
        orders: {
          select: orderSelect,
        },
      },
    });
    if (!record) throw notFound("White-label brand not found");

    return {
      ...mapBrand(record),
      products: (record.products ?? []).map(mapProduct),
      ordersCount: record.orders?.length ?? 0,
      orders: (record.orders ?? []).map(mapOrder),
    };
  },

  async createWLBrand(input: CreateWLBrandInput): Promise<WhiteLabelBrandDTO> {
    if (!input.name) {
      throw badRequest("Name is required");
    }

    if (input.slug) {
      const existing = await prisma.whiteLabelBrand.findUnique({ where: { slug: input.slug } });
      if (existing) {
        throw badRequest("Slug already exists");
      }
    }

    if (input.ownerPartnerId) {
      const partner = await prisma.partner.findUnique({ where: { id: input.ownerPartnerId } });
      if (!partner) throw notFound("Partner owner not found");
    }
    if (input.ownerAffiliateId) {
      const affiliate = await prisma.affiliate.findUnique({ where: { id: input.ownerAffiliateId } });
      if (!affiliate) throw notFound("Affiliate owner not found");
    }

    const created = await prisma.whiteLabelBrand.create({
      data: {
        brandId: input.brandId,
        ownerPartnerId: input.ownerPartnerId ?? null,
        ownerAffiliateId: input.ownerAffiliateId ?? null,
        name: input.name,
        slug: input.slug ?? `${input.name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`,
        status: input.status ?? "active",
        settingsJson: input.settings ? JSON.stringify(input.settings) : null,
      },
      select: brandSelect,
    });

    logger.info(`[white-label] Created brand ${created.id}`);
    return mapBrand(created);
  },

  async updateWLBrand(id: string, brandId: string, input: UpdateWLBrandInput): Promise<WhiteLabelBrandDTO> {
    const existing = await prisma.whiteLabelBrand.findFirst({
      where: { id, brandId },
      select: brandSelect,
    });
    if (!existing) throw notFound("White-label brand not found");

    if (input.slug && input.slug !== existing.slug) {
      const slugTaken = await prisma.whiteLabelBrand.findUnique({ where: { slug: input.slug } });
      if (slugTaken && slugTaken.id !== id) {
        throw badRequest("Slug already in use");
      }
    }

    const updated = await prisma.whiteLabelBrand.update({
      where: { id },
      data: {
        name: input.name ?? existing.name,
        slug: input.slug ?? existing.slug,
        status: input.status ?? existing.status,
        settingsJson:
          input.settings !== undefined
            ? input.settings
              ? JSON.stringify(input.settings)
              : null
            : existing.settingsJson,
      },
      select: brandSelect,
    });

    logger.info(`[white-label] Updated brand ${id}`);
    return mapBrand(updated);
  },

  async listWLProducts(params: WLProductListParams): Promise<WLProductListResponse> {
    if (!params.brandId) {
      throw badRequest("brandId is required");
    }

    await ensureWLBrandOwnership(params.wlBrandId, params.brandId);

    const { page = 1, pageSize = 20, search, wlBrandId } = params;
    const { skip, take } = buildPagination({ page, pageSize });

    const where: Prisma.WhiteLabelProductWhereInput = {
      wlBrandId,
    };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
      ];
    }

    const [total, rows] = await prisma.$transaction([
      prisma.whiteLabelProduct.count({ where }),
      prisma.whiteLabelProduct.findMany({
        where,
        select: productSelect,
        orderBy: { updatedAt: "desc" },
        skip,
        take,
      }),
    ]);

    return {
      items: rows.map(mapProduct),
      total,
      page,
      pageSize: take,
    };
  },

  async createWLProduct(input: CreateWLProductInput): Promise<WhiteLabelProductDTO> {
    await ensureWLBrandOwnership(input.wlBrandId, input.brandId);

    if (input.baseProductId) {
      const baseProduct = await prisma.brandProduct.findUnique({ where: { id: input.baseProductId } });
      if (!baseProduct) throw notFound("Base product not found");
    }

    if (input.sku) {
      const skuExists = await prisma.whiteLabelProduct.findFirst({
        where: { sku: input.sku },
      });
      if (skuExists) throw badRequest("SKU already exists");
    }

    const created = await prisma.whiteLabelProduct.create({
      data: {
        wlBrandId: input.wlBrandId,
        baseProductId: input.baseProductId ?? null,
        name: input.name,
        sku: input.sku ?? null,
      },
      select: productSelect,
    });

    logger.info(`[white-label] Created product ${created.id} for brand ${input.wlBrandId}`);
    return mapProduct(created);
  },

  async getWLBrandStats(id: string, brandId: string): Promise<WLBrandStatsDTO> {
    const brand = await prisma.whiteLabelBrand.findFirst({
      where: { id, brandId },
      select: { id: true },
    });
    if (!brand) throw notFound("White-label brand not found");

    const [productCount, orderMetrics] = await prisma.$transaction([
      prisma.whiteLabelProduct.count({ where: { wlBrandId: id } }),
      prisma.whiteLabelOrder.aggregate({
        where: { wlBrandId: id },
        _count: true,
        _sum: { total: true },
      }),
    ]);

    return {
      brandId: id,
      productsCount: productCount,
      ordersCount: orderMetrics._count,
      totalRevenue: Number(orderMetrics._sum.total ?? 0),
    };
  },

  async createWLOrder(input: CreateWLOrderInput): Promise<WhiteLabelOrderDTO> {
    await ensureWLBrandOwnership(input.wlBrandId, input.brandId);
    const created = await prisma.whiteLabelOrder.create({
      data: {
        wlBrandId: input.wlBrandId,
        total: input.total,
        status: input.status ?? "draft",
      },
      select: orderSelect,
    });

    await emitWhiteLabelOrderCreated(
      {
        brandId: input.brandId,
        wlBrandId: input.wlBrandId,
        orderId: created.id,
        totalAmount: Number(created.total ?? 0),
        currency: input.currency,
        newStatus: created.status ?? "draft",
      },
      { brandId: input.brandId, module: "white-label", source: "api" },
    );

    return mapOrder(created);
  },
  updateWLOrderStatus,
  requestPricingSync,
};

async function updateWLOrderStatus(
  orderId: string,
  input: UpdateWLOrderStatusInput,
): Promise<WhiteLabelOrderDTO> {
  const order = await ensureOrderForBrand(orderId, input.brandId);
  const updated = await prisma.whiteLabelOrder.update({
    where: { id: orderId },
    data: {
      status: input.newStatus,
    },
    select: orderSelect,
  });

  await emitWhiteLabelOrderStatusChanged(
    {
      brandId: input.brandId,
      wlBrandId: input.wlBrandId,
      orderId: updated.id,
      totalAmount: Number(updated.total ?? 0),
      currency: undefined,
      oldStatus: order.status ?? undefined,
      newStatus: updated.status ?? undefined,
    },
    { brandId: input.brandId, module: "white-label", source: "api" },
  );

  return mapOrder(updated);
}

async function requestPricingSync(input: PricingSyncRequestInput) {
  await ensureWLBrandOwnership(input.wlBrandId, input.brandId);
  await emitWhiteLabelPricingSyncRequested(
    {
      brandId: input.brandId,
      wlBrandId: input.wlBrandId,
      productId: input.productId,
      currentPrice: input.currentPrice,
      targetChannels: input.targetChannels,
    },
    { brandId: input.brandId, module: "white-label", source: "api" },
  );
  return { status: "queued" };
}

async function ensureOrderForBrand(orderId: string, brandId: string) {
  const order = await prisma.whiteLabelOrder.findUnique({
    where: { id: orderId },
    include: { wlBrand: { select: { id: true, brandId: true } } },
  });
  if (!order) throw notFound("Order not found");
  if (order.wlBrand.brandId !== brandId) {
    throw badRequest("Order does not belong to the requested brand");
  }
  return order;
}
