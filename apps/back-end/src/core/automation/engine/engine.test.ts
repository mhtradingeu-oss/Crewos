import {
  AutomationExecutionResult,
  AutomationRuleVersion,
} from "@mh-os/shared";

import { executeRuleVersion } from "./engine.js";

const createRunMock = jest.fn();
const createActionRunMock = jest.fn();
const updateActionRunStatusMock = jest.fn();
const updateRunStatusMock = jest.fn();

jest.mock("./run-repository.js", () => ({
  createRun: (...args: Parameters<typeof createRunMock>) => createRunMock(...args),
  createActionRun: (...args: Parameters<typeof createActionRunMock>) =>
    createActionRunMock(...args),
  updateActionRunStatus: (...args: Parameters<typeof updateActionRunStatusMock>) =>
    updateActionRunStatusMock(...args),
  updateRunStatus: (...args: Parameters<typeof updateRunStatusMock>) =>
    updateRunStatusMock(...args),
}));

const recordAuditMock = jest.fn();
jest.mock("../audit/automation-audit.js", () => ({
  recordAudit: (...args: Parameters<typeof recordAuditMock>) =>
    recordAuditMock(...args),
}));

const persistExplainSnapshotMock = jest.fn();
jest.mock("../audit/automation-explain.store.js", () => ({
  persistExplainSnapshot: (
    ...args: Parameters<typeof persistExplainSnapshotMock>
  ) => persistExplainSnapshotMock(...args),
}));

const onRunStartMock = jest.fn();
const onRunEndMock = jest.fn();
const onActionStartMock = jest.fn();
const onActionEndMock = jest.fn();
jest.mock("../observability/automation-metrics.js", () => ({
  automationMetricsCollector: {
    onRunStart: (...args: Parameters<typeof onRunStartMock>) =>
      onRunStartMock(...args),
    onRunEnd: (...args: Parameters<typeof onRunEndMock>) =>
      onRunEndMock(...args),
    onActionStart: (...args: Parameters<typeof onActionStartMock>) =>
      onActionStartMock(...args),
    onActionEnd: (...args: Parameters<typeof onActionEndMock>) =>
      onActionEndMock(...args),
  },
}));

const baseRun = {
  id: "run-000",
  ruleId: "rule-001",
  ruleVersionId: "version-001",
  status: "PENDING",
  createdAt: new Date("2024-01-01T00:00:00.000Z"),
  updatedAt: new Date("2024-01-01T00:00:00.000Z"),
  startedAt: new Date("2024-01-01T00:00:00.000Z"),
  finishedAt: new Date("2024-01-01T00:00:00.000Z"),
};

const buildRuleVersion = (
  actionConfigs: unknown[]
): AutomationRuleVersion => ({
  ruleId: "rule-001",
  versionNumber: 1,
  id: "version-001",
  triggerEvent: "manual.trigger",
  conditionConfigJson: null,
  actionsConfigJson: actionConfigs,
  metaSnapshotJson: null,
});

describe("executeRuleVersion multi-action sequencing", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    createRunMock.mockReset();
    createActionRunMock.mockReset();
    updateActionRunStatusMock.mockReset();
    updateRunStatusMock.mockReset();
    recordAuditMock.mockReset();
    persistExplainSnapshotMock.mockReset();
    onRunStartMock.mockReset();
    onRunEndMock.mockReset();
    onActionStartMock.mockReset();
    onActionEndMock.mockReset();
  });

  it("records successful multi-action execution and hooks metrics/audit/persistence", async () => {
    const run = { ...baseRun, id: "run-success" };
    const updatedRun = {
      ...run,
      finishedAt: new Date("2024-01-01T00:02:00.000Z"),
      updatedAt: new Date("2024-01-01T00:02:00.000Z"),
    };

    createRunMock.mockResolvedValue(run);
    updateRunStatusMock.mockResolvedValue(updatedRun);
    updateActionRunStatusMock.mockResolvedValue({}); // unused payload

    let actionRunCalls = 0;
    createActionRunMock.mockImplementation(async (runId, actionType) => {
      const startedAt = new Date(
        run.startedAt.valueOf() + actionRunCalls * 1000
      );
      actionRunCalls += 1;
      return {
        id: `${actionType}-run`,
        runId,
        actionType,
        startedAt,
        createdAt: startedAt,
        updatedAt: startedAt,
        finishedAt: startedAt,
      };
    });

    const actionRunner = jest.fn(async (actionType, params) => ({
      actionType,
      params,
    }));

    const ruleVersion = buildRuleVersion([
      { type: "action-one", params: { foo: "bar" } },
      { type: "action-two", params: { baz: "qux" } },
    ]);

    const result = await executeRuleVersion({
      ruleVersion,
      actorId: "actor-1",
      companyId: "company-1",
      brandId: "brand-1",
      context: undefined,
      actionRunner,
    });

    expect(result.execution.status).toBe("SUCCESS");
    expect(result.execution.error).toBeUndefined();
    expect(result.execution.actions).toHaveLength(2);
    expect(result.execution.actions[0]).toMatchObject({
      actionType: "action-one",
      status: "SUCCESS",
      output: { actionType: "action-one", params: { foo: "bar" } },
      index: 0,
    });
    expect(result.execution.actions[1]).toMatchObject({
      actionType: "action-two",
      status: "SUCCESS",
      output: { actionType: "action-two", params: { baz: "qux" } },
      index: 1,
    });
    expect(actionRunner).toHaveBeenCalledTimes(2);
    expect(recordAuditMock.mock.calls.map(([payload]) => payload.type)).toEqual([
      "RUN_START",
      "ACTION_START",
      "ACTION_SUCCESS",
      "ACTION_START",
      "ACTION_SUCCESS",
      "RUN_END",
    ]);
    expect(onRunStartMock).toHaveBeenCalledTimes(1);
    expect(onRunEndMock).toHaveBeenCalledTimes(1);
    expect(onActionStartMock).toHaveBeenCalledTimes(2);
    expect(onActionEndMock).toHaveBeenCalledTimes(2);
    expect(persistExplainSnapshotMock).toHaveBeenCalledTimes(1);
    expect(persistExplainSnapshotMock.mock.calls[0][0]).toMatchObject({
      finalStatus: "SUCCESS",
      actions: [
        expect.objectContaining({ status: "SUCCESS" }),
        expect.objectContaining({ status: "SUCCESS" }),
      ],
    });
    expect(updateRunStatusMock).toHaveBeenCalledWith(
      run.id,
      "SUCCESS",
      undefined
    );
  });

  it("short-circuits after an action failure and reports errors", async () => {
    const run = { ...baseRun, id: "run-failure" };
    const updatedRun = {
      ...run,
      finishedAt: new Date("2024-01-01T00:03:00.000Z"),
      updatedAt: new Date("2024-01-01T00:03:00.000Z"),
    };

    createRunMock.mockResolvedValue(run);
    updateRunStatusMock.mockResolvedValue(updatedRun);
    updateActionRunStatusMock.mockResolvedValue({});

    let actionRunCalls = 0;
    createActionRunMock.mockImplementation(async (runId, actionType) => {
      const startedAt = new Date(
        run.startedAt.valueOf() + actionRunCalls * 1000
      );
      actionRunCalls += 1;
      return {
        id: `${actionType}-run`,
        runId,
        actionType,
        startedAt,
        createdAt: startedAt,
        updatedAt: startedAt,
        finishedAt: startedAt,
      };
    });

    const actionRunner = jest
      .fn()
      .mockImplementation(async (actionType) => {
        if (actionType === "action-two") {
          throw new Error("action-two failed");
        }
        return { actionType };
      });

    const ruleVersion = buildRuleVersion([
      { type: "action-one" },
      { type: "action-two" },
    ]);

    const { execution } = await executeRuleVersion({
      ruleVersion,
      actorId: "actor-1",
      companyId: "company-1",
      actionRunner,
    });

    expect(execution.status).toBe("FAILED");
    expect(execution.error).toBe("action-two failed");
    const executionWithError = execution as AutomationExecutionResult & {
      executionError?: {
        code: string;
        message: string;
        metadata?: { actionType?: string; actionIndex?: number };
      };
    };
    expect(executionWithError.executionError).toMatchObject({
      code: "ACTION_FAILED",
      message: "action-two failed",
      metadata: { actionType: "action-two", actionIndex: 1 },
    });
    expect(execution.actions).toHaveLength(2);
    expect(execution.actions[0]).toBeDefined();
    expect(execution.actions[0]?.status).toBe("SUCCESS");
    expect(execution.actions[1]).toMatchObject({
      status: "FAILED",
      error: "action-two failed",
    });
    expect(recordAuditMock.mock.calls.map(([payload]) => payload.type)).toEqual([
      "RUN_START",
      "ACTION_START",
      "ACTION_SUCCESS",
      "ACTION_START",
      "ACTION_FAILED",
      "RUN_END",
    ]);
    expect(onActionStartMock).toHaveBeenCalledTimes(2);
    expect(onActionEndMock).toHaveBeenCalledTimes(2);
    expect(onRunEndMock).toHaveBeenCalledTimes(1);
    expect(persistExplainSnapshotMock).toHaveBeenCalledTimes(1);
    expect(persistExplainSnapshotMock.mock.calls[0][0]).toMatchObject({
      finalStatus: "FAILED",
      error: "action-two failed",
    });
    expect(updateRunStatusMock).toHaveBeenCalledWith(
      run.id,
      "FAILED",
      "action-two failed"
    );
  });

  it("throws when there are no configured actions", async () => {
    const run = { ...baseRun, id: "run-empty-actions" };
    createRunMock.mockResolvedValue(run);
    const ruleVersion = buildRuleVersion([]);

    await expect(
      executeRuleVersion({
        ruleVersion,
        actorId: "actor-1",
        companyId: "company-1",
        actionRunner: async () => ({}),
      })
    ).rejects.toThrow("No actions defined in rule version");

    expect(recordAuditMock).toHaveBeenCalledTimes(1);
    expect(recordAuditMock.mock.calls[0][0].type).toBe("RUN_START");
    expect(updateRunStatusMock).not.toHaveBeenCalled();
    expect(persistExplainSnapshotMock).not.toHaveBeenCalled();
    expect(onRunStartMock).toHaveBeenCalledTimes(1);
    expect(onRunEndMock).not.toHaveBeenCalled();
  });
});
