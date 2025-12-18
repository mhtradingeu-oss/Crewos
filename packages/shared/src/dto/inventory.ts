import { z } from "zod";

const productIdArraySchema = z.preprocess((value) => {
  if (typeof value === "string") {
    const list = value
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    return list.length ? list : undefined;
  }
  if (Array.isArray(value)) {
    const list = value.map((entry) => String(entry).trim()).filter(Boolean);
    return list.length ? list : undefined;
  }
  return undefined;
}, z.array(z.string().min(1)).optional());

export const inventoryGetStockQuerySchema = z.object({
  brandId: z.string().trim().min(1).optional(),
  productIds: productIdArraySchema,
});

export type InventoryGetStockQuery = z.infer<typeof inventoryGetStockQuerySchema>;

export const inventoryStockSnapshotSchema = z.object({
  id: z.string(),
  companyId: z.string(),
  brandId: z.string().optional(),
  productId: z.string(),
  quantityOnHand: z.number().int(),
  quantity: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type InventoryStockSnapshot = z.infer<typeof inventoryStockSnapshotSchema>;

export const inventoryMovementRecordSchema = z.object({
  id: z.string(),
  inventoryItemId: z.string(),
  companyId: z.string(),
  brandId: z.string().optional(),
  productId: z.string(),
  delta: z.number().int(),
  reason: z.string(),
  referenceId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  actorId: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type InventoryMovementRecord = z.infer<typeof inventoryMovementRecordSchema>;

export const inventoryAdjustInputSchema = z
  .object({
    companyId: z.string().trim(),
    brandId: z.string().trim().optional(),
    productId: z.string().trim(),
    delta: z.number().int(),
    reason: z.string().trim().min(1),
    referenceId: z.string().trim().optional(),
    metadata: z.record(z.unknown()).optional(),
  })
  .refine((data) => data.delta !== 0, {
    message: "Delta must not be zero",
    path: ["delta"],
  });

export type InventoryAdjustInput = z.infer<typeof inventoryAdjustInputSchema>;
