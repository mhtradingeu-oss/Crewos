/**
 * PHASE 7.2.1 — Inventory OS Runtime Invariants
 * Runtime-only tests (NO DATABASE)
 * Prisma is fully mocked
 */
/// <reference types="jest" />
import { jest } from '@jest/globals';

/* ------------------------------------------------------------------ */
/* 🔧 Prisma Mock — SINGLETON TX (CRITICAL)                            */
/* ------------------------------------------------------------------ */


const inventoryItemFindUnique: jest.Mock = jest.fn();
const inventoryItemUpsert: jest.Mock = jest.fn();
const inventoryMovementCreate: jest.Mock = jest.fn();

// ✅ Singleton TX — reference must NEVER change
const tx = {
  inventoryItem: {
    findUnique: inventoryItemFindUnique,
    upsert: inventoryItemUpsert,
  },
  inventoryMovement: {
    create: inventoryMovementCreate,
  },
};

const transactionFn = jest.fn(async (fn: any) => fn(tx));

jest.unstable_mockModule('../../../core/prisma.js', () => ({
  prisma: {
    inventoryItem: {
      findUnique: inventoryItemFindUnique,
      upsert: inventoryItemUpsert,
    },
    inventoryMovement: {
      create: inventoryMovementCreate,
    },
    // ✅ ALWAYS return SAME tx reference
    $transaction: transactionFn,
    __tx: tx, // exposed for test control
  },
}));

const [
  { inventoryService },
  { InventoryInvariantError },
  { prisma },
] = await Promise.all([
  import('../inventory.service.js'),
  import('../inventory.invariants.js'),
  import('../../../core/prisma.js'),
]);

/* ------------------------------------------------------------------ */
/* 🧪 Tests                                                           */
/* ------------------------------------------------------------------ */

describe('Inventory OS — Runtime Invariants', () => {
  const TENANT_ID = 'tenant-1';
  const OTHER_TENANT_ID = 'tenant-2';
  const INVENTORY_ITEM_ID = 'inv-1';

  beforeEach(() => {
    jest.clearAllMocks();

    const now = new Date();

    tx.inventoryItem.findUnique.mockImplementation(() => ({
      id: INVENTORY_ITEM_ID,
      companyId: TENANT_ID,
      brandId: null,
      productId: null,
      quantityOnHand: 10,
      createdAt: now,
      updatedAt: now,
    }));


    tx.inventoryItem.upsert.mockImplementation(() => ({
      id: INVENTORY_ITEM_ID,
      companyId: TENANT_ID,
      brandId: null,
      productId: null,
      quantityOnHand: 15,
      createdAt: now,
      updatedAt: now,
    }));


    tx.inventoryMovement.create.mockImplementation(() => ({
      id: 'move-1',
      inventoryItemId: INVENTORY_ITEM_ID,
      companyId: TENANT_ID,
      brandId: null,
      productId: null,
      delta: 5,
      reason: 'adjustment',
      referenceId: null,
      metadataJson: null,
      actorId: TENANT_ID,
      createdAt: now,
      updatedAt: now,
    }));
  });

  /* --------------------------------------------------------------- */
  /* ❌ Negative Quantity                                            */
  /* --------------------------------------------------------------- */
  test('Rejects negative resulting quantity', async () => {

    await expect(
      inventoryService.createInventoryAdjustment(
        {
          inventoryItemId: INVENTORY_ITEM_ID,
          delta: -20,
          actorId: TENANT_ID,
        },
        tx as unknown as import("@prisma/client").PrismaClient
      )
    ).rejects.toThrow(InventoryInvariantError);

    expect(tx.inventoryItem.upsert).not.toHaveBeenCalled();
    expect(tx.inventoryMovement.create).not.toHaveBeenCalled();
  });

  /* --------------------------------------------------------------- */
  /* ❌ Tenant Mismatch                                              */
  /* --------------------------------------------------------------- */
  test('Rejects tenant ownership mismatch', async () => {

    await expect(
      inventoryService.createInventoryAdjustment(
        {
          inventoryItemId: INVENTORY_ITEM_ID,
          delta: 1,
          actorId: OTHER_TENANT_ID,
        },
        tx as unknown as import("@prisma/client").PrismaClient
      )
    ).rejects.toThrow(InventoryInvariantError);

    expect(tx.inventoryItem.upsert).not.toHaveBeenCalled();
  });

  /* --------------------------------------------------------------- */
  /* ✅ Valid Adjustment                                             */
  /* --------------------------------------------------------------- */
  test('Allows valid stock adjustment', async () => {

    await expect(
      inventoryService.createInventoryAdjustment(
        {
          inventoryItemId: INVENTORY_ITEM_ID,
          delta: 5,
          actorId: TENANT_ID,
        },
        tx as unknown as import("@prisma/client").PrismaClient
      )
    ).resolves.toBeDefined();

    expect(tx.inventoryItem.upsert).toHaveBeenCalledTimes(1);
    expect(tx.inventoryMovement.create).toHaveBeenCalledTimes(1);
  });

  /* --------------------------------------------------------------- */
  /* 🔒 Atomicity                                                    */
  /* --------------------------------------------------------------- */
  test('Does not mutate state if persistence fails', async () => {

    tx.inventoryMovement.create.mockImplementation(() => {
      throw new Error('Simulated persistence failure');
    });


    await expect(
      inventoryService.createInventoryAdjustment(
        {
          inventoryItemId: INVENTORY_ITEM_ID,
          delta: 1,
          actorId: TENANT_ID,
        },
        tx as unknown as import("@prisma/client").PrismaClient
      )
    ).rejects.toThrow('Simulated persistence failure');

    expect(tx.inventoryItem.upsert).toHaveBeenCalledTimes(1);
    expect(tx.inventoryMovement.create).toHaveBeenCalledTimes(1);
  });
});
