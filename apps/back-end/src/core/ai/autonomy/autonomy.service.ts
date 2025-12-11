import { badRequest, notFound } from "../../http/errors.js";
import type { PipelineActor } from "../pipeline/pipeline-types.js";
import { executeAutonomyTask } from "./autonomy.executor.js";
import { runAutonomyLoop, type AutonomyLoopOptions } from "./autonomy.loop.js";
import type {
  AutonomyCycleResult,
  AutonomyExecutionResult,
  AutonomyPlan,
  AutonomyStatus,
  AutonomyTask,
} from "./autonomy.types.js";

class AutonomyService {
  private pending = new Map<string, AutonomyTask>();
  private blocked = new Map<string, AutonomyTask>();
  private completed = new Map<string, AutonomyTask>();
  private running = new Map<string, AutonomyTask>();
  private lastPlan?: AutonomyPlan;
  private lastDetections: AutonomyCycleResult["detections"] = [];
  private lastExecuted: AutonomyExecutionResult[] = [];
  private lastRunAt?: string;
  private globalAutonomyEnabled = true;

  getStatus(): AutonomyStatus {
    return {
      lastRunAt: this.lastRunAt,
      queued: Array.from(this.running.values()),
      running: Array.from(this.running.values()),
      completed: Array.from(this.completed.values()),
      blocked: Array.from(this.blocked.values()),
      pendingApproval: Array.from(this.pending.values()),
      lastDetections: this.lastDetections,
      lastPlan: this.lastPlan,
      globalAutonomyEnabled: this.globalAutonomyEnabled,
      totalPending: this.pending.size,
      totalExecuted: this.completed.size,
      totalRejected: Array.from(this.blocked.values()).filter((t) => t.status === "REJECTED").length,
    };
  }

  getPending(filters?: {
    severity?: "low" | "medium" | "high";
    brandId?: string;
    type?: string;
    limit?: number;
    offset?: number;
  }): AutonomyTask[] {
    const limit = filters?.limit ?? 20;
    const offset = filters?.offset ?? 0;

    const filtered = Array.from(this.pending.values()).filter((task) => {
      const severityOk = filters?.severity
        ? task.risk.toLowerCase() === filters.severity.toLowerCase()
        : true;
      const brandOk = filters?.brandId
        ? task.actor?.brandId === filters.brandId || task.inputs?.brandId === filters.brandId
        : true;
      const typeOk = filters?.type ? task.engine === filters.type || task.goal?.includes(filters.type) : true;
      return severityOk && brandOk && typeOk;
    });

    return filtered.slice(offset, offset + limit);
  }

  getPlan(): AutonomyPlan | undefined {
    return this.lastPlan;
  }

  getExecuted(): AutonomyExecutionResult[] {
    return this.lastExecuted;
  }

  getConfig() {
    return {
      globalAutonomyEnabled: this.globalAutonomyEnabled,
      defaultAutonomyLevelPerAgent: "AUTO_LOW_RISK_ONLY" as const,
    };
  }

  setConfig(config: { globalAutonomyEnabled?: boolean }) {
    if (typeof config.globalAutonomyEnabled === "boolean") {
      this.globalAutonomyEnabled = config.globalAutonomyEnabled;
    }
    return this.getConfig();
  }

  async runCycle(options?: AutonomyLoopOptions): Promise<AutonomyCycleResult> {
    const result = await runAutonomyLoop({
      ...options,
      autoExecute: this.globalAutonomyEnabled ? options?.autoExecute : false,
    });
    this.lastRunAt = new Date().toISOString();
    this.lastDetections = result.detections;
    this.lastPlan = { tasks: result.planned, createdAt: this.lastRunAt, fromIssues: result.detections };

    const plannedById = new Map(result.planned.map((t) => [t.taskId, t]));

    result.pendingApproval.forEach((task) => {
      this.pending.set(task.taskId, { ...task, status: "PENDING" });
    });

    result.blocked.forEach((task) => {
      this.blocked.set(task.taskId, { ...task, status: "BLOCKED" });
    });

    result.queued.forEach((task) => {
      this.running.set(task.taskId, { ...task, status: "QUEUED" });
    });

    result.executed.forEach((execution) => {
      const task = plannedById.get(execution.taskId);
      if (task) {
        const completedTask: AutonomyTask = {
          ...task,
          status: "COMPLETED",
          updatedAt: new Date().toISOString(),
          result: execution,
        };
        this.completed.set(task.taskId, completedTask);
      }
    });

    this.lastExecuted = result.executed;

    return result;
  }

  async approveTask(taskId: string, actor?: PipelineActor) {
    const task = this.pending.get(taskId) ?? this.blocked.get(taskId) ?? this.running.get(taskId);
    if (!task) throw notFound("Task not found or already processed");

    const { result, governance } = await executeAutonomyTask(task, {
      actorOptions: {
        actor,
        brandId: (task.inputs.brandId as string | undefined) ?? (task.actor?.brandId ?? undefined),
        tenantId:
          (typeof task.actor?.tenantId === "string" ? task.actor.tenantId : undefined) ??
          (typeof actor?.tenantId === "string" ? actor.tenantId : undefined),
      },
    });

    const completedTask: AutonomyTask = {
      ...task,
      status: governance && governance.safeToProceed === false ? "BLOCKED" : "COMPLETED",
      updatedAt: new Date().toISOString(),
      result,
      governance: governance ?? task.governance,
    };

    this.pending.delete(taskId);
    this.blocked.delete(taskId);
    this.running.delete(taskId);

    if (completedTask.status === "BLOCKED") {
      this.blocked.set(taskId, completedTask);
    } else {
      this.completed.set(taskId, completedTask);
    }

    this.lastExecuted = [...this.lastExecuted.filter((r) => r.taskId !== taskId), result];

    return completedTask;
  }

  rejectTask(taskId: string, reason?: string) {
    const task = this.pending.get(taskId);
    if (!task) throw notFound("Task not found in pending queue");
    this.pending.delete(taskId);
    const rejected: AutonomyTask = {
      ...task,
      status: "REJECTED",
      updatedAt: new Date().toISOString(),
      result: {
        success: false,
        taskId,
        engineOutput: { reason: reason ?? "Rejected by reviewer" },
        nextAction: null,
        pipeline: null,
        contexts: undefined,
      },
    };
    this.blocked.set(taskId, rejected);
    return rejected;
  }

  enqueue(task: AutonomyTask) {
    if (!task.taskId) throw badRequest("taskId required");
    this.pending.set(task.taskId, { ...task, status: "PENDING" });
  }
}

export const autonomyService = new AutonomyService();
