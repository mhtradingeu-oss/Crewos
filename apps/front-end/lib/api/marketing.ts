import { api } from "./client";
import type { PaginatedResponse } from "./types";

export interface CampaignDto {
  id: string;
  brandId?: string;
  channelId?: string;
  name: string;
  objective?: string;
  budget?: number | null;
  status?: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function listCampaigns(params?: {
  brandId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}) {
  const { data } = await api.get<PaginatedResponse<CampaignDto>>("/marketing", { params });
  return data;
}

export async function createCampaign(payload: Partial<CampaignDto>) {
  const { data } = await api.post<CampaignDto>("/marketing", payload);
  return data;
}

export async function updateCampaign(id: string, payload: Partial<CampaignDto>) {
  const { data } = await api.put<CampaignDto>(`/marketing/${id}`, payload);
  return data;
}

export async function getCampaign(id: string) {
  const { data } = await api.get<CampaignDto>(`/marketing/${id}`);
  return data;
}

export async function deleteCampaign(id: string) {
  await api.delete(`/marketing/${id}`);
}
