/**
 * PHASE 7.2.1 — Inventory OS Runtime Invariants
 * Runtime-only tests (NO DATABASE)
 * Prisma is fully mocked
 */
/// <reference types="jest" />
import { jest } from '@jest/globals';
import type { Prisma, PrismaClient } from '@prisma/client';

const buildPrismaPromise = <T>(value: T): Prisma.PrismaPromise<T> =>
  Promise.resolve(value) as Prisma.PrismaPromise<T>;

type InventoryItemStub = {
  id: string;
  companyId: string;
  brandId: string | null;
  brandScopeKey: string | null;
  warehouseId: string | null;
  productId: string | null;
  quantityOnHand: number;
  createdAt: Date;
  updatedAt: Date;
  brand: null;
  product: null;
  warehouse: null;
  movements: [];
};

type InventoryMovementStub = {
  id: string;
  companyId: string;
  brandId: string | null;
  productId: string | null;
  inventoryItemId: string;
  delta: number;
  reason: string;
  referenceId: string | null;
  metadataJson: Prisma.JsonValue | null;
  actorId: string;
  createdAt: Date;
  updatedAt: Date;
  inventoryItem: null;
};

type InventoryEventStub = {
  id: string;
  type: string;
  occurredAt: Date;
  companyId: string;
  inventoryItemId: string;
  idempotencyKey: string;
  payload: Prisma.JsonValue;
};

type InventoryItemFindUniqueFn = (
  args: Parameters<PrismaClient['inventoryItem']['findUnique']>[0],
) => Prisma.PrismaPromise<InventoryItemStub | null>;
type InventoryItemUpsertFn = (
  args: Parameters<PrismaClient['inventoryItem']['upsert']>[0],
) => Prisma.PrismaPromise<InventoryItemStub>;
type InventoryMovementCreateFn = (
  args: Parameters<PrismaClient['inventoryMovement']['create']>[0],
) => Prisma.PrismaPromise<InventoryMovementStub>;

const inventoryItemFindUnique = jest.fn() as jest.MockedFunction<InventoryItemFindUniqueFn>;
const inventoryItemUpsert = jest.fn() as jest.MockedFunction<InventoryItemUpsertFn>;
const inventoryMovementCreate = jest.fn() as jest.MockedFunction<InventoryMovementCreateFn>;
const inventoryEventCreate = jest.fn() as jest.MockedFunction<(
  args: Parameters<PrismaClient['inventoryEvent']['create']>[0],
) => Prisma.PrismaPromise<InventoryEventStub>>;

const tx = {
  inventoryItem: {
    findUnique: inventoryItemFindUnique,
    upsert: inventoryItemUpsert,
  },
  inventoryMovement: {
    create: inventoryMovementCreate,
  },
} as unknown as Prisma.TransactionClient;

const transactionFn = jest.fn(async (fn: (client: Prisma.TransactionClient) => Promise<unknown>) => fn(tx));

jest.unstable_mockModule('../../../core/prisma.js', () => ({
  prisma: {
    inventoryItem: {
      findUnique: inventoryItemFindUnique,
      upsert: inventoryItemUpsert,
    },
    inventoryMovement: {
      create: inventoryMovementCreate,
    },
    inventoryEvent: {
      create: inventoryEventCreate,
    },
    // ✅ ALWAYS return SAME tx reference
    $transaction: transactionFn,
    __tx: tx, // exposed for test control
  },
}));

const [
  { inventoryService },
  { InventoryInvariantError },

] = await Promise.all([
  import('../inventory.service.js'),
  import('../inventory.invariants.js'),

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

    inventoryItemFindUnique.mockImplementation(() =>
      buildPrismaPromise<InventoryItemStub | null>({
        id: INVENTORY_ITEM_ID,
        companyId: TENANT_ID,
        brandId: null,
        productId: null,
        quantityOnHand: 10,
        createdAt: now,
        updatedAt: now,
        brandScopeKey: null,
        warehouseId: null,
        brand: null,
        product: null,
        warehouse: null,
        movements: [],
      } as InventoryItemStub),
    );

    inventoryItemUpsert.mockImplementation(() =>
      buildPrismaPromise<InventoryItemStub>({
        id: INVENTORY_ITEM_ID,
        companyId: TENANT_ID,
        brandId: null,
        productId: null,
        quantityOnHand: 15,
        createdAt: now,
        updatedAt: now,
        brandScopeKey: null,
        warehouseId: null,
        brand: null,
        product: null,
        warehouse: null,
        movements: [],
      } as InventoryItemStub),
    );

    inventoryMovementCreate.mockImplementation(() =>
      buildPrismaPromise<InventoryMovementStub>({
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
        inventoryItem: null,
        createdAt: now,
        updatedAt: now,
      } as InventoryMovementStub),
    );

    inventoryEventCreate.mockImplementation(() =>
      buildPrismaPromise<InventoryEventStub>({
        id: 'evt-runtime',
        type: 'INVENTORY_STOCK_ADJUSTED',
        occurredAt: new Date(),
        companyId: TENANT_ID,
        inventoryItemId: INVENTORY_ITEM_ID,
        idempotencyKey: 'runtime-event',
        payload: { eventId: 'runtime' } as Prisma.JsonValue,
      }),
    );
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
          idempotencyKey: 'runtime-neg-quantity',
        },
        tx as unknown as PrismaClient,
      ),
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
          idempotencyKey: 'runtime-tenant-mismatch',
        },
        tx as unknown as PrismaClient,
      ),
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
          idempotencyKey: 'runtime-valid-adjustment',
        },
        tx as unknown as PrismaClient,
      ),
    ).resolves.toBeDefined();

    expect(tx.inventoryItem.upsert).toHaveBeenCalledTimes(1);
    expect(tx.inventoryMovement.create).toHaveBeenCalledTimes(1);
  });

  /* --------------------------------------------------------------- */
  /* 🔒 Atomicity                                                    */
  /* --------------------------------------------------------------- */
  test('Concurrency: OCC path executes without retry when no conflict occurs', async () => {
    inventoryMovementCreate.mockImplementation(() => {
      throw new Error('Simulated persistence failure');
    });

    
    await expect(
      inventoryService.createInventoryAdjustment(
        {
          inventoryItemId: INVENTORY_ITEM_ID,
          delta: 1,
          actorId: TENANT_ID,
          idempotencyKey: 'runtime-occ-no-conflict',
        },
        tx as unknown as PrismaClient,
      ),
    ).rejects.toThrow('Simulated persistence failure');

    expect(tx.inventoryItem.upsert).toHaveBeenCalledTimes(1);
    expect(tx.inventoryMovement.create).toHaveBeenCalledTimes(1);
  });
});
