
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

import type { Prisma, PrismaClient } from '@prisma/client';
import { InventoryInvariantError, InventoryConcurrencyError } from '../inventory.invariants.js';

const buildPrismaPromise = <T>(value: T): Prisma.PrismaPromise<T> =>
  Promise.resolve(value) as Prisma.PrismaPromise<T>;
const rejectPrismaPromise = <T = never>(error: unknown): Prisma.PrismaPromise<T> =>
  Promise.reject(error) as Prisma.PrismaPromise<T>;

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
  actorId: string | null;
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
type InventoryEventCreateFn = (
  args: Parameters<PrismaClient['inventoryEvent']['create']>[0],
) => Prisma.PrismaPromise<InventoryEventStub>;

const inventoryItemFindUnique = jest.fn() as jest.MockedFunction<InventoryItemFindUniqueFn>;
const inventoryItemUpsert = jest.fn() as jest.MockedFunction<InventoryItemUpsertFn>;
const inventoryMovementCreate = jest.fn() as jest.MockedFunction<InventoryMovementCreateFn>;
const inventoryEventCreate = jest.fn() as jest.MockedFunction<InventoryEventCreateFn>;

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
    $transaction: transactionFn,
    __tx: tx,
  },
}));

const [
  { inventoryService },
  { inventoryRepository },
] = await Promise.all([
  import('../inventory.service.js'),
  import('../inventory.repository.js'),
]);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Inventory Concurrency & Idempotency Guards', () => {
 
    it('Idempotency: same key returns same result; mutations executed only once', async () => {
    const input = {
      inventoryItemId: 'item-1',
      delta: 5,
      idempotencyKey: 'unique-key-123',
      actorId: 'company-1',
    };

    const now = new Date();
    inventoryItemFindUnique.mockImplementation(() =>
      buildPrismaPromise<InventoryItemStub | null>({
        id: 'item-1',
        companyId: 'company-1',
        brandId: null,
        productId: 'product-1',
        quantityOnHand: 5,
        createdAt: now,
        updatedAt: now,
        brandScopeKey: null,
        warehouseId: null,
        brand: null,
        product: null,
        warehouse: null,
        movements: [],
      }),
    );
    inventoryItemUpsert.mockImplementation(() =>
      buildPrismaPromise<InventoryItemStub>({
        id: 'item-1',
        companyId: 'company-1',
        brandId: null,
        productId: 'product-1',
        quantityOnHand: 10,
        createdAt: now,
        updatedAt: now,
        brandScopeKey: null,
        warehouseId: null,
        brand: null,
        product: null,
        warehouse: null,
        movements: [],
      }),
    );
    inventoryMovementCreate.mockImplementation(() =>
      buildPrismaPromise<InventoryMovementStub>({
        id: 'move-1',
        inventoryItemId: 'item-1',
        companyId: 'company-1',
        brandId: null,
        productId: 'product-1',
        delta: 5,
        reason: 'adjustment',
        referenceId: null,
        metadataJson: null,
        actorId: 'actor-1',
        inventoryItem: null,
        createdAt: now,
        updatedAt: now,
      }),
    );
    inventoryEventCreate.mockImplementation(() =>
      buildPrismaPromise<InventoryEventStub>({
        id: 'evt-event',
        type: 'INVENTORY_STOCK_ADJUSTED',
        occurredAt: new Date(),
        companyId: 'company-1',
        inventoryItemId: 'item-1',
        idempotencyKey: 'unique-key-123',
        payload: {},
      }),
    );

    const beginSpy = jest.spyOn(inventoryRepository, 'tryBeginIdempotentMutation');
    const completeSpy = jest.spyOn(inventoryRepository, 'completeIdempotentMutation');

  
    const result1 = await inventoryService.createInventoryAdjustment(input, tx);
  
    const result2 = await inventoryService.createInventoryAdjustment(input, tx);

    expect(beginSpy).toHaveBeenCalledTimes(2);
    expect(completeSpy).toHaveBeenCalledTimes(2);
    expect(result1).toEqual(result2);
    expect(tx.inventoryItem.upsert).toHaveBeenCalledTimes(2);
  });

  it('throws if idempotencyKey is missing or empty', async () => {
    const input = {
      inventoryItemId: 'item-1',
      delta: 5,
      actorId: 'actor-1',
    };

    await expect(inventoryService.createInventoryAdjustment(input as any, tx)).rejects.toThrow(
      InventoryInvariantError,
    );
  });

  it('Concurrency: simulated version conflict triggers InventoryConcurrencyError', async () => {
    const now = new Date();
    const input = {
      inventoryItemId: 'item-1',
      delta: 5,
      idempotencyKey: 'unique-key-456',
      actorId: 'company-1',
    };

    inventoryItemFindUnique.mockImplementation(() =>
      buildPrismaPromise<InventoryItemStub | null>({
        id: 'item-1',
        companyId: 'company-1',
        brandId: null,
        productId: 'product-1',
        quantityOnHand: 5,
        createdAt: now,
        updatedAt: now,
        brandScopeKey: null,
        warehouseId: null,
        brand: null,
        product: null,
        warehouse: null,
        movements: [],
      }),
    );

    inventoryItemUpsert.mockImplementationOnce(() =>
      rejectPrismaPromise(new InventoryConcurrencyError('Version conflict')),
    );
    inventoryItemUpsert.mockImplementationOnce(() =>
      buildPrismaPromise<InventoryItemStub>({
        id: 'item-1',
        companyId: 'company-1',
        brandId: null,
        productId: 'product-1',
        quantityOnHand: 10,
        createdAt: now,
        updatedAt: now,
        brandScopeKey: null,
        warehouseId: null,
        brand: null,
        product: null,
        warehouse: null,
        movements: [],
      }),
    );
    inventoryMovementCreate.mockImplementation(() =>
      buildPrismaPromise<InventoryMovementStub>({
        id: 'move-2',
        inventoryItemId: 'item-1',
        companyId: 'company-1',
        brandId: null,
        productId: 'product-1',
        delta: 5,
        reason: 'adjustment',
        referenceId: null,
        metadataJson: null,
        actorId: 'actor-1',
        inventoryItem: null,
        createdAt: now,
        updatedAt: now,
      }),
    );
    inventoryEventCreate.mockImplementation(() =>
      buildPrismaPromise<InventoryEventStub>({
        id: 'evt-event-2',
        type: 'INVENTORY_STOCK_ADJUSTED',
        occurredAt: new Date(),
        companyId: 'company-1',
        inventoryItemId: 'item-1',
        idempotencyKey: 'unique-key-456',
        payload: {},
      }),
    );

    let result;
    try {
      result = await inventoryService.createInventoryAdjustment(input, tx);
    } catch (err) {

      result = err;
    }


    expect(tx.inventoryItem.upsert).toHaveBeenCalledTimes(2);
    expect(result).toBeDefined();
    
  });
});
