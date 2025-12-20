// ESM, .js extension, no DB
import { jest } from "@jest/globals";
import { AutomationRuntimeRepository } from "../automation.runtime.repository.js";

jest.mock("../../../core/prisma.js", () => ({
  PrismaClient: jest.fn(() => ({
    automationRun: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    automationActionRun: {
      update: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  })),
}));

describe("AutomationRuntimeRepository (Persistence)", () => {
  it("creates run + actionRuns once", async () => {
    // ...test implementation...
  });

  it("duplicate idempotencyKey returns existing run (exactly-once)", async () => {
    // ...test implementation...
  });
});
