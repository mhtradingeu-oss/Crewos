/**
 * PHASE 7.4 — Event Router Runtime Tests
 * ESM-compatible (NO DB, NO Prisma)
 */

import { describe, it, expect, jest } from "@jest/globals";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(
  fileURLToPath(import.meta.url)
);

import {
  registerHandler,
  routeEvent,
} from "./event-router.js";

import { InventoryEventType } from "@mh-os/shared";

describe("event-router", () => {
  it("should call handler once", async () => {
    const handler = jest.fn(async () => {});

    registerHandler(
      InventoryEventType.STOCK_ADJUSTED,
      handler
    );

    await routeEvent({
      type: InventoryEventType.STOCK_ADJUSTED,
    });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("should call multiple consumers for same event", async () => {
    const handler1 = jest.fn(async () => {});
    const handler2 = jest.fn(async () => {});

    registerHandler(
      InventoryEventType.STOCK_ADJUSTED,
      handler1
    );
    registerHandler(
      InventoryEventType.STOCK_ADJUSTED,
      handler2
    );

    await routeEvent({
      type: InventoryEventType.STOCK_ADJUSTED,
    });

    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler2).toHaveBeenCalledTimes(1);
  });

  it("should not break other consumers if one fails", async () => {
    const failing = jest.fn(async () => {
      throw new Error("fail");
    });
    const success = jest.fn(async () => {});

    registerHandler(
      InventoryEventType.STOCK_ADJUSTED,
      failing
    );
    registerHandler(
      InventoryEventType.STOCK_ADJUSTED,
      success
    );

    await expect(
      routeEvent({
        type: InventoryEventType.STOCK_ADJUSTED,
      })
    ).resolves.not.toThrow();

    expect(success).toHaveBeenCalledTimes(1);
  });

  it("should not use Prisma", () => {
    const implPath = path.resolve(
      __dirname,
      "./event-router.ts"
    );
    const code = fs.readFileSync(implPath, "utf8");
    expect(code).not.toMatch(/prisma/i);
  });
});
