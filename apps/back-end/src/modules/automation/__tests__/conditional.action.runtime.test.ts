import { createConditionalAction } from "../actions/conditional.action.js";
import type {
  AutomationActionContext,
  AutomationActionResult,
  ConditionalActionPayload,
} from "@mh-os/shared";

describe("conditional.action", () => {
  const makeExecutor = (results: AutomationActionResult[]) => ({
    async executeAction(action: unknown, context: AutomationActionContext) {
      // Return next result in array, or a default
      return results.shift() ?? {
        actionKey: String((action as any)?.key ?? "test"),
        status: "SUCCESS",
        idempotencyKey: context.idempotencyKey,
      };
    },
  });

  const baseContext: AutomationActionContext = {
    executionId: "exec-1",
    idempotencyKey: "idem-123",
    companyId: "co-1",
    source: "SYSTEM",
  };

  it("executes THEN branch when predicate matches", async () => {
    const payload: ConditionalActionPayload = {
      predicate: { type: "equals", path: "foo", value: 42 },
      thenActions: [{ key: "A" }],
      elseActions: [{ key: "B" }],
    };
    const executor = makeExecutor([
      { actionKey: "A", status: "SUCCESS", idempotencyKey: baseContext.idempotencyKey },
    ]);
    const adapter = createConditionalAction(executor);
    const result = await adapter.execute(payload, { ...baseContext, foo: 42 });
    expect(result.status).toBe("SUCCESS");
    expect(result.subResults).toHaveLength(1);
    expect(result.subResults[0].actionKey).toBe("A");
    expect(result.idempotencyKey).toBe(baseContext.idempotencyKey);
  });

  it("executes ELSE branch when predicate fails", async () => {
    const payload: ConditionalActionPayload = {
      predicate: { type: "equals", path: "foo", value: 42 },
      thenActions: [{ key: "A" }],
      elseActions: [{ key: "B" }],
    };
    const executor = makeExecutor([
      { actionKey: "B", status: "SUCCESS", idempotencyKey: baseContext.idempotencyKey },
    ]);
    const adapter = createConditionalAction(executor);
    const result = await adapter.execute(payload, { ...baseContext, foo: 99 });
    expect(result.status).toBe("SUCCESS");
    expect(result.subResults).toHaveLength(1);
    expect(result.subResults[0].actionKey).toBe("B");
    expect(result.idempotencyKey).toBe(baseContext.idempotencyKey);
  });

  it("preserves idempotencyKey", async () => {
    const payload: ConditionalActionPayload = {
      predicate: { type: "exists", path: "foo" },
      thenActions: [{ key: "A" }],
    };
    const executor = makeExecutor([
      { actionKey: "A", status: "SUCCESS", idempotencyKey: baseContext.idempotencyKey },
    ]);
    const adapter = createConditionalAction(executor);
    const result = await adapter.execute(payload, { ...baseContext, foo: true });
    expect(result.idempotencyKey).toBe(baseContext.idempotencyKey);
  });

  it("does not mutate input context or payload", async () => {
    const payload: ConditionalActionPayload = {
      predicate: { type: "exists", path: "foo" },
      thenActions: [{ key: "A" }],
    };
    const context = { ...baseContext, foo: true };
    const payloadCopy = JSON.parse(JSON.stringify(payload));
    const contextCopy = JSON.parse(JSON.stringify(context));
    const executor = makeExecutor([
      { actionKey: "A", status: "SUCCESS", idempotencyKey: baseContext.idempotencyKey },
    ]);
    const adapter = createConditionalAction(executor);
    await adapter.execute(payload, context);
    expect(payload).toEqual(payloadCopy);
    expect(context).toEqual(contextCopy);
  });

  it("returns FAILED and error on exception, does not throw", async () => {
    const payload: ConditionalActionPayload = {
      predicate: { type: "exists", path: "foo" },
      thenActions: [{ key: "A" }],
    };
    const executor = {
      async executeAction() {
        throw new Error("fail!");
      },
    };
    const adapter = createConditionalAction(executor);
    const result = await adapter.execute(payload, { ...baseContext, foo: true });
    expect(result.status).toBe("FAILED");
    expect(result.error).toMatch(/fail/);
  });

  it("output is deterministic for same input", async () => {
    const payload: ConditionalActionPayload = {
      predicate: { type: "equals", path: "foo", value: 1 },
      thenActions: [{ key: "A" }],
      elseActions: [{ key: "B" }],
    };
    const executor = makeExecutor([
      { actionKey: "A", status: "SUCCESS", idempotencyKey: baseContext.idempotencyKey },
    ]);
    const adapter = createConditionalAction(executor);
    const context = { ...baseContext, foo: 1 };
    const result1 = await adapter.execute(payload, context);
    const result2 = await adapter.execute(payload, context);
    expect(result1).toEqual(result2);
  });
});
