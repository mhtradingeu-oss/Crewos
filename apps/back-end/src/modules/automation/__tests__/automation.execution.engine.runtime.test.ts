import { AutomationExecutionEngine } from "../automation.execution.engine.js";
import { registerAction } from "../actions/action.registry.js";
import type { AutomationActionContext } from "@mh-os/shared";

describe("AutomationExecutionEngine", () => {
  const engine = new AutomationExecutionEngine();
  const baseContext: AutomationActionContext = {
    executionId: "execution-1",
    idempotencyKey: "idem-1",
    companyId: "company-1",
    source: "SYSTEM",
  };

  it("executes each action exactly once", async () => {
    const calls: string[] = [];
    registerAction({
      key: "ACTION_ONCE",
      async execute(payload) {
        calls.push(payload?.marker ?? "missing");
        return { actionKey: "ACTION_ONCE", status: "SUCCESS" };
      },
    });

    const plan = [
      { actionKey: "ACTION_ONCE", payload: { marker: "first" } },
      { actionKey: "ACTION_ONCE", payload: { marker: "second" } },
    ];

    const results = await engine.execute(plan, baseContext);

    expect(calls).toEqual(["first", "second"]);
    expect(results.length).toBe(2);
    expect(results.every((result) => result.status === "SUCCESS")).toBe(true);
  });

  it("continues executing actions when one fails", async () => {
    registerAction({
      key: "ACTION_FAIL",
      async execute(payload) {
        if (payload?.shouldFail) {
          throw new Error("boom");
        }
        return { actionKey: "ACTION_FAIL", status: "SUCCESS" };
      },
    });

    const plan = [
      { actionKey: "ACTION_FAIL", payload: { shouldFail: true } },
      { actionKey: "ACTION_FAIL", payload: { shouldFail: false } },
    ];

    const results = await engine.execute(plan, baseContext);

    expect(results[0].status).toBe("FAILED");
    expect(results[1].status).toBe("SUCCESS");
    expect(results[0].error).toBe("boom");
  });

  it("preserves the idempotency key for every action", async () => {
    const contexts: AutomationActionContext[] = [];

    registerAction({
      key: "ACTION_CONTEXT",
      async execute(_payload, context) {
        contexts.push(context);
        return { actionKey: "ACTION_CONTEXT", status: "SUCCESS" };
      },
    });

    const plan = [
      { actionKey: "ACTION_CONTEXT", payload: {} },
      { actionKey: "ACTION_CONTEXT", payload: {} },
    ];

    await engine.execute(plan, baseContext);

    expect(contexts.every((ctx) => ctx.idempotencyKey === baseContext.idempotencyKey)).toBe(true);
  });

  it("returns SKIPPED when an action is not registered", async () => {
    const results = await engine.execute(
      [{ actionKey: "MISSING_ACTION", payload: {} }],
      baseContext
    );

    expect(results).toEqual([
      {
        actionKey: "MISSING_ACTION",
        status: "SKIPPED",
      },
    ]);
  });
});
