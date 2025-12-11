import { api } from "./client";
import type { PaginatedResponse } from "./types";

export interface LeadDto {
  id: string;
  brandId?: string | null;
  status?: string;
  ownerId?: string;
  name?: string;
  email?: string;
  phone?: string;
  companyName?: string | null;
  score?: number | null;
  dealCount?: number;
  createdAt: string;
  updatedAt: string;
}

export async function listLeads(params?: {
  brandId?: string;
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const { data } = await api.get<PaginatedResponse<LeadDto>>("/crm", { params });
  return data;
}

export async function getLead(id: string) {
  const { data } = await api.get<LeadDto>(`/crm/${id}`);
  return data;
}

export async function createLead(
  payload: Partial<LeadDto> & { brandId?: string; status?: string },
) {
  const { data } = await api.post<LeadDto>("/crm", payload);
  return data;
}

export async function updateLead(id: string, payload: Partial<LeadDto>) {
  const { data } = await api.put<LeadDto>(`/crm/${id}`, payload);
  return data;
}

export async function deleteLead(id: string) {
  await api.delete(`/crm/${id}`);
  return true;
}

export interface LeadAIScoreDto {
  score: number;
  probability: number;
  reasons: string[];
  nextAction: string;
}

export async function scoreLead(
  leadId: string,
  payload?: { intent?: string },
): Promise<LeadAIScoreDto> {
  const { data } = await api.post<LeadAIScoreDto>(`/crm/${leadId}/ai/score`, payload ?? {});
  return data;
}
