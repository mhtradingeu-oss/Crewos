import { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "../../core/prisma.js";
import type {
  InventoryAdjustInput,
  InventoryMovementRecord,
  InventoryStockSnapshot,
} from "@mh-os/shared";

const inventorySelect = {
  id: true,
  companyId: true,
  brandId: true,
  productId: true,
  quantityOnHand: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.InventoryItemSelect;

const movementSelect = {
  id: true,
  inventoryItemId: true,
  companyId: true,
  brandId: true,
  productId: true,
  delta: true,
  reason: true,
  referenceId: true,
  metadataJson: true,
  actorId: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.InventoryMovementSelect;

function buildBrandScopeKey(brandId?: string) {
  return brandId ? `brand:${brandId}` : "brandless";
}

function mapInventoryItem(record: Prisma.InventoryItemGetPayload<{ select: typeof inventorySelect }>): InventoryStockSnapshot {
  const quantity = Number(record.quantityOnHand ?? 0);
  return {
    id: record.id,
    companyId: record.companyId,
    brandId: record.brandId ?? undefined,
    productId: record.productId,
    quantityOnHand: quantity,
    quantity,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function mapMovement(record: Prisma.InventoryMovementGetPayload<{ select: typeof movementSelect }>): InventoryMovementRecord {
  return {
    id: record.id,
    inventoryItemId: record.inventoryItemId,
    companyId: record.companyId,
    brandId: record.brandId ?? undefined,
    productId: record.productId,
    delta: record.delta,
    reason: record.reason,
    referenceId: record.referenceId ?? undefined,
    metadata:
      record.metadataJson && typeof record.metadataJson === "object"
        ? (record.metadataJson as Record<string, unknown>)
        : undefined,
    actorId: record.actorId ?? undefined,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export async function getStockSnapshot(
  companyId: string,
  brandId?: string,
  productIds?: string[],
): Promise<InventoryStockSnapshot[]> {
  const where: Prisma.InventoryItemWhereInput = { companyId };
  if (brandId) where.brandId = brandId;
  if (productIds && productIds.length) {
    where.productId = { in: productIds };
  }
  const rows = await prisma.inventoryItem.findMany({
    where,
    select: inventorySelect,
    orderBy: { updatedAt: "desc" },
  });
  return rows.map(mapInventoryItem);
}

export async function adjustStock(
  input: InventoryAdjustInput,
  actorId: string,
  tx: Prisma.TransactionClient | PrismaClient = prisma,
): Promise<{ item: InventoryStockSnapshot; movement: InventoryMovementRecord }> {
  const brandScopeKey = buildBrandScopeKey(input.brandId);
  const delta = input.delta;
  const item = await tx.inventoryItem.upsert({
    where: {
      InventoryItem_company_brand_scope_product_unique: {
        companyId: input.companyId,
        brandScopeKey,
        productId: input.productId,
      },
    },
    create: {
      companyId: input.companyId,
      brandId: input.brandId ?? null,
      productId: input.productId,
      brandScopeKey,
      quantityOnHand: delta,
    },
    update: {
      brandId: input.brandId ?? null,
      brandScopeKey,
      quantityOnHand: { increment: delta },
    },
    select: inventorySelect,
  });

  const metadataPayload = input.metadata ? (input.metadata as Prisma.InputJsonValue) : Prisma.JsonNull;

  const movement = await tx.inventoryMovement.create({
    data: {
      inventoryItemId: item.id,
      companyId: input.companyId,
      brandId: input.brandId ?? null,
      productId: input.productId,
      delta,
      reason: input.reason ?? "adjustment",
      referenceId: input.referenceId ?? null,
      metadataJson: metadataPayload,
      actorId,
    },
    select: movementSelect,
  });

  return { item: mapInventoryItem(item), movement: mapMovement(movement) };
}

export const inventoryRepository = {
  getStockSnapshot,
  adjustStock,
};
