import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "../../prisma.js";

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

type InventoryDbClient = PrismaClient | Prisma.TransactionClient;

export type InventoryListOptions = {
  skip?: number;
  take?: number;
  orderBy?: Prisma.InventoryItemOrderByWithRelationInput;
};

export {
  inventorySelect,
  transactionSelect,
  adjustmentSelect,
};

export async function listInventoryItemsWithCount(
  where: Prisma.InventoryItemWhereInput,
  options: InventoryListOptions = {},
) {
  const { skip, take, orderBy } = options;
  const [total, items] = await prisma.$transaction([
    prisma.inventoryItem.count({ where }),
    prisma.inventoryItem.findMany({
      where,
      select: inventorySelect,
      orderBy: orderBy ?? { updatedAt: "desc" },
      skip,
      take,
    }),
  ]);
  return { total, rows: items };
}

export async function findInventoryItem(
  where: Prisma.InventoryItemWhereInput,
  client?: InventoryDbClient,
) {
  return (client ?? prisma).inventoryItem.findFirst({
    where,
    select: inventorySelect,
  });
}

export async function listInventoryItems(
  where: Prisma.InventoryItemWhereInput,
  options: { orderBy?: Prisma.InventoryItemOrderByWithRelationInput } = {},
  client?: InventoryDbClient,
) {
  return (client ?? prisma).inventoryItem.findMany({
    where,
    select: inventorySelect,
    orderBy: options.orderBy ?? { updatedAt: "desc" },
  });
}

export async function findBrandProductById(
  id: string,
  client?: InventoryDbClient,
) {
  return (client ?? prisma).brandProduct.findUnique({
    where: { id },
    select: { id: true, brandId: true },
  });
}

export async function findWarehouseById(
  id: string,
  client?: InventoryDbClient,
) {
  return (client ?? prisma).warehouse.findUnique({
    where: { id },
    select: { id: true, brandId: true },
  });
}

export async function createInventoryItem(
  data: Prisma.InventoryItemUncheckedCreateInput,
  client?: InventoryDbClient,
) {
  return (client ?? prisma).inventoryItem.create({
    data,
    select: inventorySelect,
  });
}

export async function updateInventoryItemQuantity(
  id: string,
  data: Prisma.InventoryItemUpdateArgs["data"],
  client?: InventoryDbClient,
) {
  return (client ?? prisma).inventoryItem.update({
    where: { id },
    data,
    select: inventorySelect,
  });
}

export async function createInventoryTransaction(
  data: Prisma.InventoryTransactionUncheckedCreateInput,
  client?: InventoryDbClient,
) {
  return (client ?? prisma).inventoryTransaction.create({
    data,
    select: transactionSelect,
  });
}

export async function createStockAdjustment(
  data: Prisma.StockAdjustmentUncheckedCreateInput,
  client?: InventoryDbClient,
) {
  return (client ?? prisma).stockAdjustment.create({
    data,
    select: adjustmentSelect,
  });
}
