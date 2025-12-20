// ESM, .js extension, no DB
import { jest } from "@jest/globals";
import { AutomationRuntimeService } from "../automation.runtime.service.js";

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

describe("AutomationRuntimeService (Orchestration)", () => {
  it("engine is NOT called if begin transaction fails", async () => {
    // ...test implementation...
  });

  it("engine failures produce FAILED actionRuns but other actions continue", async () => {
    // ...test implementation...
  });

  it("adapters never touch Prisma", async () => {
    // ...test implementation...
  });
});
