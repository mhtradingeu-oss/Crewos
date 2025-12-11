import { api } from "./client";

export type DepartmentScope =
  | "marketing"
  | "sales"
  | "crm"
  | "loyalty"
  | "finance"
  | "inventory"
  | "brand";

export interface DepartmentAgentProfile {
  key: DepartmentScope;
  name: string;
  charter: string;
  defaultFocus: string;
}

export interface MeetingActionItem {
  department: DepartmentScope;
  task: string;
  owner?: string;
  dueDate?: string;
  impact?: string;
}

export interface DepartmentRecommendation {
  department: DepartmentScope;
  headline: string;
  summary: string;
  actionItems: MeetingActionItem[];
}

export interface StandContextPayload {
  standId?: string;
  products?: Array<{
    productId: string;
    sku?: string;
    name?: string;
    currentQty?: number;
    location?: string;
  }>;
  inventorySnapshot?: Array<{
    locationId?: string;
    locationName?: string;
    productId: string;
    sku?: string;
    name?: string;
    quantity: number;
    status?: string;
    lastRefillAt?: string;
  }>;
  notes?: string;
}

export interface SalesRepContextPayload {
  repId?: string;
  leads?: Array<{
    leadId?: string;
    name?: string;
    stage?: string;
    status?: string;
    score?: number;
  }>;
  visits?: Array<{
    visitId?: string;
    partnerId?: string;
    purpose?: string;
    result?: string;
    date?: string;
  }>;
  notes?: string;
}

export interface VirtualOfficeMeetingSummary {
  summary: string;
  brand?: { id: string; name: string; slug?: string };
  scope?: string;
  topic: string;
  departments: DepartmentScope[];
  recommendations: DepartmentRecommendation[];
  agenda: { title: string; desiredOutcome: string; owner?: string; dueDate?: string }[];
  actionItems: MeetingActionItem[];
  risks?: string[];
}

export async function listAgents(params?: { brandId?: string; scope?: string }) {
  const { data } = await api.get("/ai/agents", { params });
  return data;
}

export async function createAgent(payload: any) {
  const { data } = await api.post("/ai/agents", payload);
  return data;
}

export async function updateAgent(id: string, payload: any) {
  const { data } = await api.put(`/ai/agents/${id}`, payload);
  return data;
}

export async function deleteAgent(id: string) {
  await api.delete(`/ai/agents/${id}`);
  return true;
}

export async function testAgent(id: string, payload: any) {
  const { data } = await api.post(`/ai/agents/${id}/test`, payload);
  return data;
}

export async function refreshInsights(payload: { brandId?: string; scope?: string }) {
  const { data } = await api.post(`/ai/insights/refresh`, payload);
  return data;
}

export async function listInsights(params?: {
  brandId?: string;
  domain?: string;
  scope?: string;
  agentId?: string;
  severity?: "low" | "medium" | "high";
  limit?: number;
  offset?: number;
  periodStart?: string;
  periodEnd?: string;
  sortOrder?: "asc" | "desc";
}) {
  const { data } = await api.get(`/ai/insights`, { params });
  return data;
}

export async function getInsight(id: string) {
  const { data } = await api.get(`/ai/insights/${id}`);
  return data;
}

export async function createReport(payload: {
  title: string;
  brandId?: string;
  scope?: string;
  periodStart?: Date;
  periodEnd?: Date;
}) {
  const { data } = await api.post(`/ai/insights/reports`, payload);
  return data;
}

export async function listReports(params?: {
  brandId?: string;
  scope?: string;
  periodStart?: string;
  periodEnd?: string;
}) {
  const { data } = await api.get(`/ai/insights/reports/list`, { params });
  return data;
}

export async function getReport(id: string) {
  const { data } = await api.get(`/ai/insights/reports/${id}`);
  return data;
}

export async function getReportRendered(id: string) {
  const { data } = await api.get(`/ai/insights/reports/${id}/render`);
  return data;
}

export async function assistantChat(payload: any) {
  const { data } = await api.post(`/ai/assistant/chat`, payload);
  return data;
}

export async function listVirtualOfficeDepartments() {
  const { data } = await api.get<DepartmentAgentProfile[]>(`/ai/virtual-office/departments`);
  return data;
}

export async function runVirtualOfficeMeeting(payload: {
  topic: string;
  departments: DepartmentScope[];
  brandId?: string;
  scope?: string;
  agenda?: string[];
  notes?: string;
  standContext?: StandContextPayload;
  salesRepContext?: SalesRepContextPayload;
}) {
  const { data } = await api.post<VirtualOfficeMeetingSummary>(
    `/ai/virtual-office/meeting`,
    payload,
  );
  return data;
}
