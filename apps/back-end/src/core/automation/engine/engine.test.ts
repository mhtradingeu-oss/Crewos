import { jest } from "@jest/globals";
import type {
  AutomationExecutionResult,
  AutomationRuleVersion,
} from "@mh-os/shared";

import { executeRuleVersion } from "./engine.js";

/* ------------------------------------------------------------------ */
/* Mocks (typed once, casted at boundaries)                            */
/* ------------------------------------------------------------------ */

const createRunMock = jest.fn<any, any>();
const createActionRunMock = jest.fn<any, any>();
const updateActionRunStatusMock = jest.fn<any, any>();
const updateRunStatusMock = jest.fn<any, any>();

jest.mock("./run-repository.js", () => ({
  createRun: (...args: any[]) => createRunMock(...args),
  createActionRun: (...args: any[]) => createActionRunMock(...args),
  updateActionRunStatus: (...args: any[]) =>
    updateActionRunStatusMock(...args),
  updateRunStatus: (...args: any[]) => updateRunStatusMock(...args),
}));

const recordAuditMock = jest.fn<any, any>();
jest.mock("../audit/automation-audit.js", () => ({
  recordAudit: (...args: any[]) => recordAuditMock(...args),
}));

const persistExplainSnapshotMock = jest.fn<any, any>();
jest.mock("../audit/automation-explain.store.js", () => ({
  persistExplainSnapshot: (...args: any[]) =>
    persistExplainSnapshotMock(...args),
}));

const onRunStartMock = jest.fn();
const onRunEndMock = jest.fn();
const onActionStartMock = jest.fn();
const onActionEndMock = jest.fn();

jest.mock("../observability/automation-metrics.js", () => ({
  automationMetricsCollector: {
    onRunStart: (...args: any[]) => onRunStartMock(...args),
    onRunEnd: (...args: any[]) => onRunEndMock(...args),
    onActionStart: (...args: any[]) => onActionStartMock(...args),
    onActionEnd: (...args: any[]) => onActionEndMock(...args),
  },
}));

/* ------------------------------------------------------------------ */
/* Fixtures                                                           */
/* ------------------------------------------------------------------ */

const baseRun = {
  id: "run-000",
  ruleId: "rule-001",
  ruleVersionId: "version-001",
  status: "PENDING",
  createdAt: new Date(),
  updatedAt: new Date(),
  startedAt: new Date(),
  finishedAt: new Date(),
};

const buildRuleVersion = (
  actions: unknown[]
): AutomationRuleVersion =>
  ({
    id: "version-001",
    ruleId: "rule-001",
    versionNumber: 1,
    triggerEvent: "manual.trigger",
    conditionConfigJson: null,
    actionsConfigJson: actions,
    metaSnapshotJson: null,
  } as AutomationRuleVersion);

/* ------------------------------------------------------------------ */
/* Tests                                                              */
/* ------------------------------------------------------------------ */

describe("executeRuleVersion – multi-action sequencing", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("executes multiple actions successfully", async () => {
    const run = { ...baseRun, id: "run-success" };

    
    createRunMock.mockResolvedValue(run as any);
    updateRunStatusMock.mockResolvedValue(run as any);
    updateActionRunStatusMock.mockResolvedValue({} as any);

    let idx = 0;
    createActionRunMock.mockImplementation(async (runId, actionType) => {
      idx++;
      return {
        id: `${actionType}-run`,
        runId,
        actionType,
        startedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        finishedAt: new Date(),
      };
    });

    const actionRunner: jest.Mock<Promise<unknown>, [string, unknown]> = jest.fn(async (actionType: string, params: unknown) => ({
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

    expect(result.execution.actions).toHaveLength(2);

    expect(actionRunner).toHaveBeenCalledTimes(2);

    const auditTypes = recordAuditMock.mock.calls.map(
      ([payload]: any[]) => payload.type
    );

    expect(auditTypes).toEqual([
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
  });

  it("stops execution on action failure", async () => {
    const run = { ...baseRun, id: "run-fail" };

    createRunMock.mockResolvedValue(run);
    updateRunStatusMock.mockResolvedValue(run);
    updateActionRunStatusMock.mockResolvedValue({});

    createActionRunMock.mockImplementation(async (runId, actionType) => ({
      id: `${actionType}-run`,
      runId,
      actionType,
      startedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      finishedAt: new Date(),
    } as any));

    const actionRunner = jest.fn(async (actionType: string) => {
      if (actionType === "action-two") {
        throw new Error("action-two failed");
      }
      return {};
    });

    const ruleVersion = buildRuleVersion([
      { type: "action-one" },
      { type: "action-two" },
    ]);

    const result = await executeRuleVersion({
      ruleVersion,
      actorId: "actor-1",
      companyId: "company-1",
      actionRunner,
    });

    expect(result.execution.status).toBe("FAILED");
    expect(result.execution.error).toBe("action-two failed");
    expect(result.execution.actions[1]?.status).toBe("FAILED");

    const auditTypes = recordAuditMock.mock.calls.map(
      ([payload]: any[]) => payload.type
    );

    expect(auditTypes).toContain("ACTION_FAILED");
    expect(persistExplainSnapshotMock).toHaveBeenCalledTimes(1);
  });

  it("throws if no actions are configured", async () => {
    const run = { ...baseRun, id: "run-empty" };
    createRunMock.mockResolvedValue(run);


    await expect(
      executeRuleVersion({
        ruleVersion: buildRuleVersion([]),
        actorId: "actor-1",
        companyId: "company-1",
        actionRunner: async () => ({}),
      })
    ).rejects.toThrow("No actions defined in rule version");

    expect(recordAuditMock).toHaveBeenCalledTimes(1);
    
    expect(updateRunStatusMock).not.toHaveBeenCalled();
    
    expect(persistExplainSnapshotMock).not.toHaveBeenCalled();
  
  });
});
