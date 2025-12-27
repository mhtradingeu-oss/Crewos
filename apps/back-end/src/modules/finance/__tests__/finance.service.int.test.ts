import { financeService } from '../finance.service.js';
jest.mock('../../../core/events/event-bus', () => ({ publish: jest.fn() }));
const { publish } = require('../../../core/events/event-bus');


beforeAll(async () => {
  // Optionally run migrations
});
afterAll(async () => {});
afterEach(async () => {
  jest.clearAllMocks();
});

describe('FinanceService Integration', () => {
  it('creates and persists a finance record, emits event', async () => {
    const input = { amount: 1000, currency: 'USD' };
    const created = await financeService.create(input);
    expect(created.amount).toBe(input.amount);
    expect(created.currency).toBe(input.currency);
    const found = await financeService.getById(created.id);
    expect(found).not.toBeNull();
    expect(found.amount).toBe(input.amount);
    expect(publish).toHaveBeenCalled();
  });

  it('updates a finance record and persists changes', async () => {
    const input = { amount: 500, currency: 'USD' };
    const created = await financeService.create(input);
    const update = { amount: 750 };
    const updated = await financeService.update(created.id, update);
    expect(updated.amount).toBe(750);
    const found = await financeService.getById(created.id);
    expect(found.amount).toBe(750);
  });
});
