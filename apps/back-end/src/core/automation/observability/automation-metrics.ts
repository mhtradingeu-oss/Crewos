import type {
  AutomationMetricsActionEndPayload,
  AutomationMetricsActionStartPayload,
  AutomationMetricsCollector,
  AutomationMetricsRunEndPayload,
  AutomationMetricsRunStartPayload,
  AutomationMetricsSnapshot,
} from "@mh-os/shared";

const createSnapshot = (): AutomationMetricsSnapshot => ({
  runsStarted: 0,
  runsSucceeded: 0,
  runsFailed: 0,
  actionsStarted: 0,
  actionsSucceeded: 0,
  actionsFailed: 0,
  runDurationMs: 0,
});

const parseTimestamp = (value?: string): number => {
  if (!value) {
    return Date.now();
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? Date.now() : parsed;
};

class InMemoryAutomationMetricsCollector implements AutomationMetricsCollector {
  private readonly snapshotState = createSnapshot();
  private readonly runStartTimes = new Map<string, number>();

  public get snapshot(): AutomationMetricsSnapshot {
    return { ...this.snapshotState };
  }

  public onRunStart(payload: AutomationMetricsRunStartPayload): void {
    this.snapshotState.runsStarted += 1;
    this.runStartTimes.set(payload.runId, parseTimestamp(payload.startedAt));
  }

  public onRunEnd(payload: AutomationMetricsRunEndPayload): void {
    const finishedAt = parseTimestamp(payload.finishedAt);
    const startedAt =
      this.runStartTimes.get(payload.runId) ?? parseTimestamp(payload.startedAt);
    const durationMs = Math.max(0, finishedAt - startedAt);
    const finalDuration = payload.durationMs ?? durationMs;
    this.snapshotState.runDurationMs += finalDuration;
    this.runStartTimes.delete(payload.runId);

    if (payload.status === "SUCCESS") {
      this.snapshotState.runsSucceeded += 1;
    } else {
      this.snapshotState.runsFailed += 1;
    }
  }

  public onActionStart(_payload: AutomationMetricsActionStartPayload): void {
    this.snapshotState.actionsStarted += 1;
  }

  public onActionEnd(payload: AutomationMetricsActionEndPayload): void {
    if (payload.status === "SUCCESS") {
      this.snapshotState.actionsSucceeded += 1;
    } else {
      this.snapshotState.actionsFailed += 1;
    }
  }
}

export const automationMetricsCollector = new InMemoryAutomationMetricsCollector();
