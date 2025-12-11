import { api } from "./client";
import type { PaginatedResponse } from "./types";

export type AutomationTriggerType = "event" | "schedule";

export interface AutomationRuleDto {
  id: string;
  brandId?: string;
  name: string;
  description?: string;
  triggerType: AutomationTriggerType;
  triggerEvent?: string;
  triggerConfig?: Record<string, unknown>;
  conditionConfig?: Record<string, unknown>;
  actions: { type: string; params?: Record<string, unknown> }[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastRunAt?: string;
  lastRunStatus?: string;
}

export async function listAutomations(params?: {
  brandId?: string;
  page?: number;
  pageSize?: number;
}) {
  const { data } = await api.get<PaginatedResponse<AutomationRuleDto>>("/automation", { params });
  return data;
}

export async function getAutomation(id: string) {
  const { data } = await api.get<AutomationRuleDto>(`/automation/${id}`);
  return data;
}

export async function createAutomation(payload: Partial<AutomationRuleDto>) {
  const { data } = await api.post<AutomationRuleDto>("/automation", payload);
  return data;
}

export async function updateAutomation(id: string, payload: Partial<AutomationRuleDto>) {
  const { data } = await api.put<AutomationRuleDto>(`/automation/${id}`, payload);
  return data;
}

export async function runAutomation(id: string) {
  const { data } = await api.post<{ id: string; status: string }>(`/automation/${id}/run`);
  return data;
}

export async function runScheduledAutomations() {
  await api.post("/automation/run-scheduled");
}
