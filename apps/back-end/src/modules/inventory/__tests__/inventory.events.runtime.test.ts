import { jest } from '@jest/globals';
import type { Prisma, PrismaClient, InventoryEvent } from '@prisma/client';
import type { InventoryStockAdjustedEvent } from '@mh-os/shared';
import { InventoryEventType } from '@mh-os/shared';
import type { InventoryAdjustmentExecutionResult } from "../inventory.events.emitter.js";

type InventoryEventCreateFn = (
  args: Parameters<PrismaClient["inventoryEvent"]["create"]>[0],
) => Prisma.PrismaPromise<InventoryEvent>;
const inventoryEventCreate = jest.fn() as jest.MockedFunction<InventoryEventCreateFn>;

jest.unstable_mockModule('../../../core/prisma.js', () => ({
  prisma: {
    inventoryEvent: {
      create: inventoryEventCreate,
    },
  },
}));

const [
  { emitInventoryStockAdjustedEvent },
  { inventoryRepository },
] = await Promise.all([
  import('../inventory.events.emitter.js'),
  import('../inventory.repository.js'),
]);

const toPrismaPromise = <T>(value: T): Prisma.PrismaPromise<T> =>
  Promise.resolve(value) as Prisma.PrismaPromise<T>;
const rejectPrismaPromise = <T = never>(error: unknown): Prisma.PrismaPromise<T> =>
  Promise.reject(error) as Prisma.PrismaPromise<T>;
const toExecutionResult = (event: InventoryStockAdjustedEvent): InventoryAdjustmentExecutionResult => ({
  eventId: event.eventId,
  companyId: event.companyId,
  brandId: event.brandId,
  productId: event.productId,
  inventoryItemId: event.inventoryItemId,
  delta: event.delta,
  quantityBefore: event.quantityBefore,
  quantityAfter: event.quantityAfter,
  idempotencyKey: event.idempotencyKey,
  actorId: event.causedBy.actorId,
  source: event.causedBy.source,
  occurredAt: event.occurredAt,
});

describe("InventoryEventEmitter Runtime", () => {
  let emittedEvents: InventoryStockAdjustedEvent[] = [];
  type InventoryEventCreateArgs = Parameters<PrismaClient["inventoryEvent"]["create"]>[0];

  beforeEach(() => {
    emittedEvents = [];
    inventoryEventCreate.mockReset();
    inventoryEventCreate.mockImplementation(({ data }: InventoryEventCreateArgs) => {
      emittedEvents.push(data.payload as unknown as InventoryStockAdjustedEvent);
      const eventRecord: InventoryEvent = {
        id: data.id,
        type: data.type,
        occurredAt: new Date(data.occurredAt),
        companyId: data.companyId,
        inventoryItemId: data.inventoryItemId,
        idempotencyKey: data.idempotencyKey,
        payload: data.payload as Prisma.JsonValue,
      };
      return toPrismaPromise(eventRecord);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("emits event exactly once", async () => {
    const result: InventoryStockAdjustedEvent = {
      eventId: "evt-1",
      type: InventoryEventType.STOCK_ADJUSTED,
      companyId: "c1",
      brandId: "b1",
      productId: "p1",
      inventoryItemId: "i1",
      delta: 5,
      quantityBefore: 10,
      quantityAfter: 15,
      idempotencyKey: "key-1",
      causedBy: { actorId: "user-1", source: "API" },
      occurredAt: new Date().toISOString(),
    };

    await emitInventoryStockAdjustedEvent({ executionResult: toExecutionResult(result) });

    expect(inventoryEventCreate).toHaveBeenCalledTimes(1);
    expect(emittedEvents).toHaveLength(1);
    const emittedEvent = emittedEvents[0]!;
    expect(emittedEvent).toMatchObject({
      type: result.type,
      companyId: result.companyId,
      brandId: result.brandId,
      productId: result.productId,
      inventoryItemId: result.inventoryItemId,
      delta: result.delta,
      quantityBefore: result.quantityBefore,
      quantityAfter: result.quantityAfter,
      idempotencyKey: result.idempotencyKey,
      causedBy: result.causedBy,
    });
    expect(typeof emittedEvent.eventId).toBe('string');
    expect(typeof emittedEvent.occurredAt).toBe('string');
  });

  it("ignores duplicate idempotency keys without emitting", async () => {
    const result: InventoryStockAdjustedEvent = {
      eventId: "evt-2",
      type: InventoryEventType.STOCK_ADJUSTED,
      companyId: "c1",
      brandId: "b1",
      productId: "p1",
      inventoryItemId: "i1",
      delta: 5,
      quantityBefore: 10,
      quantityAfter: 15,
      idempotencyKey: "key-2",
      causedBy: { actorId: "user-1", source: "API" },
      occurredAt: new Date().toISOString(),
    };

    inventoryEventCreate.mockImplementationOnce(() => {
      const error = new Error("duplicate key") as Error & { code?: string };
      error.code = "P2002";
      return rejectPrismaPromise(error);
    });

    await emitInventoryStockAdjustedEvent({ executionResult: toExecutionResult(result) });

    expect(emittedEvents).toHaveLength(0);
    expect(inventoryEventCreate).toHaveBeenCalledTimes(1);
  });

  it("does not emit when persistence fails", async () => {
    const result: InventoryStockAdjustedEvent = {
      eventId: "evt-3",
      type: InventoryEventType.STOCK_ADJUSTED,
      companyId: "c1",
      brandId: "b1",
      productId: "p1",
      inventoryItemId: "i1",
      delta: 5,
      quantityBefore: 10,
      quantityAfter: 15,
      idempotencyKey: "key-3",
      causedBy: { actorId: "user-1", source: "API" },
      occurredAt: new Date().toISOString(),
    };

    inventoryEventCreate.mockImplementationOnce(() => rejectPrismaPromise(new Error("mutation failed")));

    await expect(emitInventoryStockAdjustedEvent({ executionResult: toExecutionResult(result) })).rejects.toThrow(
      "mutation failed",
    );
    expect(emittedEvents).toHaveLength(0);
  });

  it("does not mutate the payload before emitting", async () => {
    const result: InventoryStockAdjustedEvent = {
      eventId: "evt-4",
      type: InventoryEventType.STOCK_ADJUSTED,
      companyId: "c1",
      brandId: "b1",
      productId: "p1",
      inventoryItemId: "i1",
      delta: 5,
      quantityBefore: 10,
      quantityAfter: 15,
      idempotencyKey: "key-4",
      causedBy: { actorId: "user-1", source: "API" },
      occurredAt: new Date().toISOString(),
    };
    const snapshot = JSON.parse(JSON.stringify(result));

    await emitInventoryStockAdjustedEvent({ executionResult: toExecutionResult(result) });

    expect(result).toEqual(snapshot);
    const emittedEvent = emittedEvents[0]!;
    expect(emittedEvent).toMatchObject({
      type: result.type,
      companyId: result.companyId,
      brandId: result.brandId,
      productId: result.productId,
      inventoryItemId: result.inventoryItemId,
      delta: result.delta,
      quantityBefore: result.quantityBefore,
      quantityAfter: result.quantityAfter,
      idempotencyKey: result.idempotencyKey,
      causedBy: result.causedBy,
    });
  });

  it("does not trigger repository side-effects", async () => {
    const repoSpy = jest.spyOn(inventoryRepository, "adjustStock");
    const result: InventoryStockAdjustedEvent = {
      eventId: "evt-5",
      type: InventoryEventType.STOCK_ADJUSTED,
      companyId: "c1",
      brandId: "b1",
      productId: "p1",
      inventoryItemId: "i1",
      delta: 5,
      quantityBefore: 10,
      quantityAfter: 15,
      idempotencyKey: "key-5",
      causedBy: { actorId: "user-1", source: "API" },
      occurredAt: new Date().toISOString(),
    };

    await emitInventoryStockAdjustedEvent({ executionResult: toExecutionResult(result) });

    expect(repoSpy).not.toHaveBeenCalled();
    repoSpy.mockRestore();
  });
});
