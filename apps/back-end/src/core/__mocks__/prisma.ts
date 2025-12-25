// @ts-nocheck
// Manual Jest mock for Prisma client (ai-suggestions only)
// Assign to 'prisma' without declaration to avoid TS redeclaration errors in test context
// @ts-ignore
prisma = {
  aISuggestion: {
    deleteMany: jest.fn(() => Promise.resolve({ count: 0 })),
    create: jest.fn((args: any) => Promise.resolve({ id: 'mock-id', ...args?.data })),
    findUnique: jest.fn(() => Promise.resolve(null)),
    update: jest.fn((args: any) => Promise.resolve({ ...args?.data, id: args?.where?.id || 'mock-id' })),
  },
  $transaction: jest.fn(async (cb: any) => {
    if (typeof cb === 'function') {
      return await cb(prisma);
    }
    if (Array.isArray(cb)) {
      return Promise.all(cb.map((fn: any) => fn()));
    }
    return Promise.resolve([]);
  }),
};

module.exports = { prisma };
