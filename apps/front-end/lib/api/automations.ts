// V1 READ-ONLY — AUTOMATIONS API
// All mutations are disabled. GET only.

import { apiFetch } from "./client.ts";
import type { PaginatedResponse } from "./types.ts";

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

/**
 * V1: List automations (GET only)
 */
export async function listAutomations(params?: {
  brandId?: string;
  page?: number;
  pageSize?: number;
}) {
  const qs = new URLSearchParams();
  if (params?.brandId) qs.set("brandId", params.brandId);
  if (params?.page) qs.set("page", String(params.page));
  if (params?.pageSize) qs.set("pageSize", String(params.pageSize));
  const { data } = await apiFetch<PaginatedResponse<AutomationRuleDto>>(`/automation?${qs.toString()}`);
  return data ?? [];
}

/**
 * V1: Get single automation
 */
export async function getAutomation(id: string) {
  const { data } = await apiFetch<AutomationRuleDto>(`/automation/${id}`);
  return data ?? null;
}

/* =========================
   🚫 MUTATIONS DISABLED (V1)
   ========================= */


export async function createAutomation(_: Partial<AutomationRuleDto>): Promise<null> {
  return null;
}

export async function updateAutomation(_: string, __: Partial<AutomationRuleDto>): Promise<null> {
  return null;
}

export async function runAutomation(_: string): Promise<null> {
  return null;
}

export async function runScheduledAutomations(): Promise<null> {
  return null;
}
