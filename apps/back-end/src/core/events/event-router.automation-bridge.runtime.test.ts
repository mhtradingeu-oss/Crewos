import { jest } from "@jest/globals";
import type {
  AutomationRuleVersion,
} from "@mh-os/shared";

import { executeRuleVersion } from "./engine.ts";
// Fix: Add explicit type annotation to baseRun to match the expected DTO type

import type { AutomationRunDTO } from "@mh-os/shared"; // adjust import if needed

const baseRun: AutomationRunDTO = {
  id: "run-000",
  ruleId: "rule-001",
  ruleVersionId: "version-001",
  status: "PENDING",
  createdAt: new Date(),
  updatedAt: new Date(),
  startedAt: new Date(),
  finishedAt: new Date(),
};
/* ------------------------------------------------------------------ */
/* Typed Jest Mocks (NO invalid generics)                              */
/* ------------------------------------------------------------------ */

const createRunMock = jest.fn();
const createActionRunMock = jest.fn();
const updateActionRunStatusMock = jest.fn();
const updateRunStatusMock = jest.fn();

jest.mock("./run-repository.js", () => ({
  createRun: (...args: unknown[]) => createRunMock(...args),
  createActionRun: (...args: unknown[]) => createActionRunMock(...args),
  updateActionRunStatus: (...args: unknown[]) =>
    updateActionRunStatusMock(...args),
  updateRunStatus: (...args: unknown[]) =>
    updateRunStatusMock(...args),
}));

const recordAuditMock = jest.fn();
jest.mock("../audit/automation-audit.js", () => ({
  recordAudit: (...args: unknown[]) => recordAuditMock(...args),
}));

const persistExplainSnapshotMock = jest.fn();
jest.mock("../audit/automation-explain.store.js", () => ({
  persistExplainSnapshot: (...args: unknown[]) =>
    persistExplainSnapshotMock(...args),
}));

const onRunStartMock = jest.fn();
const onRunEndMock = jest.fn();
const onActionStartMock = jest.fn();
const onActionEndMock = jest.fn();

jest.mock("../observability/automation-metrics.js", () => ({
  automationMetricsCollector: {
    onRunStart: (...args: unknown[]) => onRunStartMock(...args),
    onRunEnd: (...args: unknown[]) => onRunEndMock(...args),
    onActionStart: (...args: unknown[]) => onActionStartMock(...args),
    onActionEnd: (...args: unknown[]) => onActionEndMock(...args),
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

function buildRuleVersion(
  actions: unknown[]
): AutomationRuleVersion {
  return {
    id: "version-001",
    ruleId: "rule-001",
    versionNumber: 1,
    triggerEvent: "manual.trigger",
    conditionConfigJson: null,
    actionsConfigJson: actions,
    metaSnapshotJson: null,
  };
}

/* ------------------------------------------------------------------ */
/* Tests                                                              */
/* ------------------------------------------------------------------ */

describe("executeRuleVersion – multi-action sequencing", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("executes multiple actions successfully", async () => {
  const run = { ...baseRun, id: "run-success" };

  createRunMock.mockResolvedValue(run as typeof baseRun);
  updateRunStatusMock.mockResolvedValue(run as typeof baseRun);
  updateActionRunStatusMock.mockResolvedValue(undefined);

  createActionRunMock.mockImplementation(
    async (...args: unknown[]): Promise<{
      id: string;
      runId: string;
      actionType: string;
      startedAt: Date;
      createdAt: Date;
      updatedAt: Date;
      finishedAt: Date;
    }> => {
      const [runId, actionType] = args as [string, string];
      return {
        id: `${actionType}-run`,
        runId,
        actionType,
        startedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        finishedAt: new Date(),
      };
    }
  );
    const actionRunner = jest.fn(
      async (actionType: string, params: unknown) => ({
        actionType,
        params,
      })
    );

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
      ([payload]) => (payload as { type: string }).type
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
    updateActionRunStatusMock.mockResolvedValue(undefined);

   createActionRunMock.mockImplementation(
  async (...args: unknown[]) => {
    const [runId, actionType] = args as [string, string];
    return {
      id: `${actionType}-run`,
      runId,
      actionType,
      startedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      finishedAt: new Date(),
    };
  }
);

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
      ([payload]) => (payload as { type: string }).type
    );

    expect(auditTypes).toContain("ACTION_FAILED");
    expect(persistExplainSnapshotMock).toHaveBeenCalledTimes(1);
  });

  it("throws if no actions are configured", async () => {
    createRunMock.mockResolvedValue(baseRun);

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
