/**
 * INVENTORY SERVICE — MH-OS v2 (stabilized)
 */
import type { Prisma } from "@prisma/client";
import { prisma } from "../../core/prisma.js";
import { buildPagination } from "../../core/utils/pagination.js";
import { badRequest, notFound } from "../../core/http/errors.js";
import { publish } from "../../core/events/event-bus.js";
import { emitInventoryStockLow, InventoryEvents } from "./inventory.events.js";
import type {
  CreateInventoryAdjustmentInput,
  CreateInventoryItemInput,
  InventoryAdjustmentResult,
  InventoryInsightItem,
  InventoryInsightResult,
  InventoryItemDTO,
  InventoryTransactionDTO,
  ListInventoryParams,
  PaginatedInventory,
  StockAdjustmentDTO,
} from "./inventory.types.js";

const lowStockThreshold = 5;

const inventorySelect = {
  id: true,
  brandId: true,
  quantity: true,
  warehouseId: true,
  productId: true,
  createdAt: true,
  updatedAt: true,
  warehouse: { select: { id: true, name: true, location: true } },
  product: { select: { id: true, name: true, sku: true } },
} satisfies Prisma.InventoryItemSelect;

const transactionSelect = {
  id: true,
  brandId: true,
  warehouseId: true,
  productId: true,
  type: true,
  quantity: true,
  reason: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.InventoryTransactionSelect;

const adjustmentSelect = {
  id: true,
  brandId: true,
  productId: true,
  warehouseId: true,
  quantity: true,
  reason: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.StockAdjustmentSelect;

function toInventoryItemDTO(record: Prisma.InventoryItemGetPayload<{ select: typeof inventorySelect }>): InventoryItemDTO {
  return {
    id: record.id,
    brandId: record.brandId ?? undefined,
    quantity: Number(record.quantity ?? 0),
    warehouse: {
      id: record.warehouse?.id ?? record.warehouseId,
      name: record.warehouse?.name ?? "",
      location: record.warehouse?.location ?? undefined,
    },
    product: {
      id: record.product?.id ?? record.productId,
      name: record.product?.name ?? "",
      sku: record.product?.sku ?? undefined,
    },
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function toTransactionDTO(record: Prisma.InventoryTransactionGetPayload<{ select: typeof transactionSelect }>): InventoryTransactionDTO {
  return {
    id: record.id,
    brandId: record.brandId ?? undefined,
    warehouseId: record.warehouseId,
    productId: record.productId,
    type: record.type ?? "adjustment",
    quantity: Number(record.quantity ?? 0),
    reason: record.reason ?? undefined,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function toAdjustmentDTO(record: Prisma.StockAdjustmentGetPayload<{ select: typeof adjustmentSelect }>): StockAdjustmentDTO {
  return {
    id: record.id,
    brandId: record.brandId ?? undefined,
    productId: record.productId,
    warehouseId: record.warehouseId ?? undefined,
    quantity: Number(record.quantity ?? 0),
    reason: record.reason ?? undefined,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function toInsightItem(record: Prisma.InventoryItemGetPayload<{ select: typeof inventorySelect }>): InventoryInsightItem {
  return {
    productId: record.productId,
    productName: record.product?.name,
    sku: record.product?.sku,
    warehouseId: record.warehouseId ?? undefined,
    warehouseName: record.warehouse?.name,
    quantity: Number(record.quantity ?? 0),
  };
}

async function ensureInventoryItem(id: string, brandId?: string) {
  const where: Prisma.InventoryItemWhereInput = { id };
  if (brandId) where.brandId = brandId;
  const item = await prisma.inventoryItem.findFirst({ where, select: inventorySelect });
  if (!item) throw notFound("Inventory item not found");
  return item;
}

export const inventoryService = {
  async listInventory(params: ListInventoryParams = {}): Promise<PaginatedInventory> {
    const { brandId, warehouseId, productId, search, page = 1, pageSize = 20 } = params;
    const { skip, take } = buildPagination({ page, pageSize });
    const where: Prisma.InventoryItemWhereInput = {};
    if (brandId) where.brandId = brandId;
    if (warehouseId) where.warehouseId = warehouseId;
    if (productId) where.productId = productId;
    if (search) {
      where.OR = [
        { product: { name: { contains: search, mode: "insensitive" } } },
        { product: { sku: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [total, rows] = await prisma.$transaction([
      prisma.inventoryItem.count({ where }),
      prisma.inventoryItem.findMany({ where, select: inventorySelect, orderBy: { updatedAt: "desc" }, skip, take }),
    ]);

    return { items: rows.map(toInventoryItemDTO), total, page, pageSize: take } satisfies PaginatedInventory;
  },

  async getInventoryItem(id: string, brandId?: string): Promise<InventoryItemDTO | null> {
    const where: Prisma.InventoryItemWhereInput = { id };
    if (brandId) where.brandId = brandId;
    const record = await prisma.inventoryItem.findFirst({ where, select: inventorySelect });
    return record ? toInventoryItemDTO(record) : null;
  },

  async createInventoryItem(input: CreateInventoryItemInput): Promise<InventoryItemDTO> {
    const [product, warehouse] = await Promise.all([
      prisma.brandProduct.findUnique({ where: { id: input.productId }, select: { id: true, brandId: true } }),
      prisma.warehouse.findUnique({ where: { id: input.warehouseId }, select: { id: true, brandId: true } }),
    ]);
    if (!product) throw badRequest("Product not found");
    if (!warehouse) throw badRequest("Warehouse not found");
    if (product.brandId && product.brandId !== input.brandId) throw badRequest("Product brand mismatch");
    if (warehouse.brandId && warehouse.brandId !== input.brandId) throw badRequest("Warehouse brand mismatch");
    if (product.brandId && warehouse.brandId && product.brandId !== warehouse.brandId) {
      throw badRequest("Product and warehouse must belong to same brand");
    }

    const created = await prisma.inventoryItem.create({
      data: {
        brandId: input.brandId,
        warehouseId: input.warehouseId,
        productId: input.productId,
        quantity: input.quantity ?? 0,
      },
      select: inventorySelect,
    });

    return toInventoryItemDTO(created);
  },

  async createInventoryAdjustment(input: CreateInventoryAdjustmentInput, tx = prisma): Promise<InventoryAdjustmentResult> {
    const inventoryItem = await ensureInventoryItem(input.inventoryItemId, input.brandId);
    const previousQuantity = Number(inventoryItem.quantity ?? 0);
    const newQuantity = previousQuantity + Number(input.delta ?? 0);

    // استخدم tx بدلاً من prisma.$transaction
    const [updatedItem, transaction, adjustment] = await Promise.all([
      tx.inventoryItem.update({
        where: { id: inventoryItem.id },
        data: { quantity: newQuantity },
        select: inventorySelect,
      }),
      tx.inventoryTransaction.create({
        data: {
          brandId: inventoryItem.brandId ?? null,
          warehouseId: inventoryItem.warehouseId,
          productId: inventoryItem.productId,
          type: "adjustment",
          quantity: input.delta,
          reason: input.reason ?? null,
        },
        select: transactionSelect,
      }),
      tx.stockAdjustment.create({
        data: {
          brandId: inventoryItem.brandId ?? null,
          productId: inventoryItem.productId,
          warehouseId: inventoryItem.warehouseId,
          quantity: input.delta,
          reason: input.reason ?? null,
        },
        select: adjustmentSelect,
      }),
    ]);

    await handleLowStockAlert({
      brandId: updatedItem.brandId,
      warehouseId: updatedItem.warehouseId,
      productId: updatedItem.productId,
      inventoryItemId: updatedItem.id,
      previousQuantity,
      currentQuantity: newQuantity,
    });

    await publish(InventoryEvents.UPDATED, {
      brandId: updatedItem.brandId ?? undefined,
      productId: updatedItem.productId,
      warehouseId: updatedItem.warehouseId ?? undefined,
      inventoryItemId: updatedItem.id,
      action: "updated",
      metadata: { delta: input.delta },
    });

    return {
      inventoryItem: toInventoryItemDTO(updatedItem),
      transaction: toTransactionDTO(transaction),
      adjustment: toAdjustmentDTO(adjustment),
    } satisfies InventoryAdjustmentResult;
  },

  async getInsights(brandId?: string): Promise<InventoryInsightResult> {
    const where: Prisma.InventoryItemWhereInput = {};
    if (brandId) where.brandId = brandId;

    const items = await prisma.inventoryItem.findMany({ where, select: inventorySelect });
    const lowStockItems = items.filter((item) => Number(item.quantity ?? 0) <= lowStockThreshold).map(toInsightItem);
    const overstockItems = items.filter((item) => Number(item.quantity ?? 0) >= lowStockThreshold * 3).map(toInsightItem);

    return {
      summary: "Inventory insight generated",
      recommendation: overstockItems.length ? "Consider reallocating overstock" : undefined,
      lowStockItems,
      slowMovingItems: [],
      overstockItems,
      details: JSON.stringify({ lowStockItems, overstockItems }),
    };
  },
};

async function handleLowStockAlert(params: {
  brandId?: string | null;
  warehouseId?: string | null;
  productId: string;
  inventoryItemId: string;
  previousQuantity: number;
  currentQuantity: number;
}) {
  if (
    params.currentQuantity <= lowStockThreshold &&
    params.previousQuantity > lowStockThreshold
  ) {
    await emitInventoryStockLow({
      brandId: params.brandId ?? undefined,
      productId: params.productId,
      inventoryItemId: params.inventoryItemId,
      warehouseId: params.warehouseId ?? undefined,
      currentStock: params.currentQuantity,
      threshold: lowStockThreshold,
      action: "threshold-crossed",
    });
  }
}
