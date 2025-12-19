// Inventory Invariants — Production Locked

export class InventoryInvariantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InventoryInvariantError';
  }
}

export class InventoryConcurrencyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InventoryConcurrencyError';
  }
}

export function assertNonNegativeQuantity(quantity: number): void {
  if (quantity < 0) {
    throw new InventoryInvariantError('Quantity must never be negative');
  }
}

export function assertTenantOwnership(actorTenantId: string, resourceTenantId: string): void {
  if (actorTenantId !== resourceTenantId) {
    throw new InventoryInvariantError('Tenant ownership mismatch');
  }
}
