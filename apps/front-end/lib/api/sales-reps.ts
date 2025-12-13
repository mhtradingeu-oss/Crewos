import { api } from "./client";
import type { PaginatedResponse } from "./types";

export interface SalesRepSummaryDto {
  id: string;
  brandId?: string;
  userId?: string;
  code?: string;
  region?: string;
  status?: string;
  territoryCount: number;
}

export interface SalesRepTerritoryDto {
  id: string;
  territory?: { id: string; name?: string; country?: string; city?: string };
}

export interface SalesLeadDto {
  id: string;
  repId: string;
  stage?: string;
  status: string;
  source?: string;
  score?: number;
  nextAction?: string;
  createdAt: string;
}

export interface SalesVisitDto {
  id: string;
  repId: string;
  partnerId?: string;
  purpose?: string;
  result?: string;
  date?: string;
  createdAt: string;
}

export interface SalesRepDto extends SalesRepSummaryDto {
  territories?: SalesRepTerritoryDto[];
  leads?: SalesLeadDto[];
  visits?: SalesVisitDto[];
  quotes?: { id: string }[];
  orders?: { id: string }[];
}

export interface SalesRepKpiDto {
  repId: string;
  totalLeads: number;
  totalVisits: number;
  totalOrders: number;
  totalRevenue: number;
  lastUpdated: string;
}

export interface SalesRepAiPlanDto {
  prioritizedLeads: Array<{
    leadId: string;
    name?: string;
    stage?: string;
    score?: number;
    reason: string;
  }>;
  suggestedActions: Array<{
    leadId?: string;
    type: string;
    description: string;
  }>;
  emailTemplates?: Array<{
    leadId?: string;
    subject: string;
    body: string;
  }>;
  summary: string;
}

export interface SalesLeadPayload {
  leadId?: string;
  companyId?: string;
  territoryId?: string;
  source?: string;
  score?: number;
  stage?: string;
  status?: string;
  nextAction?: string;
  notes?: string;
}

export interface SalesVisitPayload {
  partnerId?: string;
  date?: string;
  purpose?: string;
  result?: string;
}

export interface SalesRepsListFilters {
  brandId?: string;
  region?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export async function listSalesReps(params?: SalesRepsListFilters) {
  const { data } = await api.get<PaginatedResponse<SalesRepSummaryDto>>("/sales-reps", { params });
  return data;
}

export async function getSalesRep(id: string) {
  const { data } = await api.get<SalesRepDto>(`/sales-reps/${id}`);
  return data;
}

export async function getSalesRepLeads(
  id: string,
  params?: { status?: string; page?: number; pageSize?: number },
) {
  const { data } = await api.get<PaginatedResponse<SalesLeadDto>>(`/sales-reps/${id}/leads`, {
    params,
  });
  return data;
}

export async function createSalesRepLead(id: string, payload: SalesLeadPayload) {
  const { data } = await api.post<SalesLeadDto>(`/sales-reps/${id}/leads`, payload);
  return data;
}

export async function getSalesRepVisits(id: string, params?: { page?: number; pageSize?: number }) {
  const { data } = await api.get<PaginatedResponse<SalesVisitDto>>(`/sales-reps/${id}/visits`, {
    params,
  });
  return data;
}

export async function createSalesRepVisit(id: string, payload: SalesVisitPayload) {
  const { data } = await api.post<SalesVisitDto>(`/sales-reps/${id}/visits`, payload);
  return data;
}

export async function getSalesRepKpis(id: string) {
  const { data } = await api.get<SalesRepKpiDto>(`/sales-reps/${id}/kpis`);
  return data;
}

export async function getSalesRepAiPlan(
  id: string,
  payload?: { brandId?: string; scope?: string; notes?: string },
) {
  const { data } = await api.post<SalesRepAiPlanDto>(
    `/sales-reps/${id}/ai/prioritize`,
    payload ?? {},
  );
  return data;
}
