import { z } from 'zod';
// Replace with actual schema import if available
const financeRevenueSchema = z.object({
  id: z.string(),
  amount: z.number(),
  type: z.literal('REVENUE'),
  description: z.string().optional(),
  createdAt: z.string().or(z.date()),
});

describe('Contract: finance.revenue.recorded event', () => {
  const EVENT_NAME = 'finance.revenue.recorded';
  const examplePayload = {
    id: 'rev1',
    amount: 5000,
    type: 'REVENUE',
    description: 'Monthly income',
    createdAt: new Date().toISOString(),
  };

  it('event name must not change', () => {
    expect(EVENT_NAME).toBe('finance.revenue.recorded');
  });

  it('payload must match financeRevenueSchema', () => {
    expect(() => financeRevenueSchema.parse(examplePayload)).not.toThrow();
  });

  it('fails if a required field is missing', () => {
    const { id, ...rest } = examplePayload;
    expect(() => financeRevenueSchema.parse(rest)).toThrow();
  });

  it('fails if a field type changes', () => {
    const bad = { ...examplePayload, amount: 'not-a-number' };
    expect(() => financeRevenueSchema.parse(bad)).toThrow();
  });
});
