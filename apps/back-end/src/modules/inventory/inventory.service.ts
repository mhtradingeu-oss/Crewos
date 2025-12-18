import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "../../core/prisma.js";
import { badRequest, notFound } from "../../core/http/errors.js";
import type {
  InventoryAdjustInput,
  InventoryMovementRecord,
  InventoryStockSnapshot,
} from "@mh-os/shared";
import { inventoryRepository } from "./inventory.repository.js";

type LegacyInventoryAdjustmentInput = {
  inventoryItemId: string;
  brandId?: string | null;
  delta: number;
  reason?: string | null;
  referenceId?: string | null;
  metadata?: Record<string, unknown>;
  actorId?: string;
};

async function resolveCompanyIdForBrand(brandId?: string) {
  if (!brandId) {
    throw badRequest("brandId is required");
  }
  const brand = await prisma.brand.findUnique({
    where: { id: brandId },
    select: { tenantId: true },
  });
  if (!brand?.tenantId) {
    throw notFound("Brand or tenant not found");
  }
  return brand.tenantId;
}

export const inventoryService = {
  async getStockSnapshot(companyId: string, brandId?: string, productIds?: string[]) {
    return inventoryRepository.getStockSnapshot(companyId, brandId, productIds);
  },

  async adjustStock(input: InventoryAdjustInput, actorId: string) {
    if (!actorId) {
      throw badRequest("actorId is required for adjustments");
    }
    return inventoryRepository.adjustStock(input, actorId);
  },

  async getInventoryItem(productId: string, brandId?: string): Promise<InventoryStockSnapshot | null> {
    const companyId = await resolveCompanyIdForBrand(brandId);
    const [item] = await inventoryRepository.getStockSnapshot(companyId, brandId, [productId]);
    return item ?? null;
  },

  async createInventoryAdjustment(
    input: LegacyInventoryAdjustmentInput,
    tx?: Prisma.TransactionClient | PrismaClient,
  ): Promise<{ item: InventoryStockSnapshot; movement: InventoryMovementRecord }> {
    const client = tx ?? prisma;
    const inventoryItem = await client.inventoryItem.findUnique({
      where: { id: input.inventoryItemId },
      select: { id: true, companyId: true, brandId: true, productId: true },
    });
    if (!inventoryItem) {
      throw notFound("Inventory item not found");
    }
    const adjustInput: InventoryAdjustInput = {
      companyId: inventoryItem.companyId,
      brandId: inventoryItem.brandId ?? undefined,
      productId: inventoryItem.productId,
      delta: input.delta,
      reason: input.reason ?? "inventory adjustment",
      referenceId: input.referenceId ?? undefined,
      metadata: input.metadata,
    };
    return inventoryRepository.adjustStock(adjustInput, input.actorId ?? "system", client);
  },
};
