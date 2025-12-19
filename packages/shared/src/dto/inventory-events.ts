// packages/shared/src/dto/inventory-events.ts

export enum InventoryEventType {
  STOCK_ADJUSTED = 'INVENTORY_STOCK_ADJUSTED',
}

export interface InventoryStockAdjustedEvent {
  readonly eventId: string;
  readonly type: InventoryEventType.STOCK_ADJUSTED;
  readonly occurredAt: string; // ISO timestamp

  readonly companyId: string;
  readonly brandId?: string;
  readonly productId: string;
  readonly inventoryItemId: string;

  readonly delta: number;
  readonly quantityBefore: number;
  readonly quantityAfter: number;

  readonly idempotencyKey: string;

  readonly causedBy: {
    readonly actorId: string;
    readonly source: 'API' | 'AUTOMATION' | 'SYSTEM';
  };
}
