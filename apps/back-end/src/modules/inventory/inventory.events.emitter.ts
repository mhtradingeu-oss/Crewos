import { prisma } from '../../core/prisma.js';
import {
  InventoryEventType,
  InventoryStockAdjustedEvent,
} from '@mh-os/shared';

export type InventoryAdjustmentExecutionResult = {
  readonly eventId: string;
  readonly companyId: string;
  readonly brandId?: string;
  readonly productId: string;
  readonly inventoryItemId: string;
  readonly delta: number;
  readonly quantityBefore: number;
  readonly quantityAfter: number;
  readonly idempotencyKey: string;
  readonly actorId: string;
  readonly source: 'API' | 'AUTOMATION' | 'SYSTEM';
  readonly occurredAt: string;
};

/**
 * Emits inventory events POST-COMMIT ONLY
 * Idempotent, append-only, no transactions here
 */
export async function emitInventoryStockAdjustedEvent(input: {
  executionResult: InventoryAdjustmentExecutionResult;
}): Promise<void> {
  const r = input.executionResult;

  const event: InventoryStockAdjustedEvent = {
    eventId: crypto.randomUUID(),
    type: InventoryEventType.STOCK_ADJUSTED,
    occurredAt: new Date().toISOString(),

    companyId: r.companyId,
    brandId: r.brandId,
    productId: r.productId,
    inventoryItemId: r.inventoryItemId,

    delta: r.delta,
    quantityBefore: r.quantityBefore,
    quantityAfter: r.quantityAfter,

    idempotencyKey: r.idempotencyKey,
    causedBy: {
      actorId: r.actorId,
      source: r.source,
    },
  };

  try {
    await prisma.inventoryEvent.create({
      data: {
        id: event.eventId,
        type: event.type,
        occurredAt: new Date(event.occurredAt),

        companyId: event.companyId,
        inventoryItemId: event.inventoryItemId,
        idempotencyKey: event.idempotencyKey,

        payload: event as unknown as object,
      },
    });
  } catch (err: any) {
    // Duplicate idempotencyKey → ignore silently (exactly-once)
    if (err?.code === 'P2002') {
      return;
    }
    throw err;
  }
}
