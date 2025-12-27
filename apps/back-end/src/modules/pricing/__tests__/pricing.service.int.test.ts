import { pricingService } from '../pricing.service.js';


jest.mock('../../../core/events/event-bus', () => ({ publish: jest.fn() }));
const { publish } = require('../../../core/events/event-bus');


beforeAll(async () => {
  // Run migrations or reset DB
  // If using PostgreSQL, use truncate or migrate
});

afterAll(async () => {});
afterEach(async () => {
  jest.clearAllMocks();
});

describe('PricingService Integration', () => {
  it('creates and persists a pricing record, emits event', async () => {
    const input = { productId: 'p1', currency: 'USD', basePrice: 100, cost: 80 };
    const created = await pricingService.create(input);
    expect(created.productId).toBe(input.productId);
    expect(created.currency).toBe(input.currency);
    expect(created.basePrice).toBe(input.basePrice);
    const found = await pricingService.getById(created.id);
    expect(found).not.toBeNull();
    expect(found.basePrice).toBe(input.basePrice);
    expect(publish).toHaveBeenCalled();
  });

  it('updates a pricing record and persists changes', async () => {
    const input = { productId: 'p2', currency: 'USD', basePrice: 200, cost: 150 };
    const created = await pricingService.create(input);
    const update = { priceId: created.id, basePrice: 250 };
    const updated = await pricingService.update(created.id, update);
    expect(updated.basePrice).toBe(250);
    const found = await pricingService.getById(created.id);
    expect(found.basePrice).toBe(250);
  });
});
