import { client } from "./client";
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
  const { data } = await client.get<PaginatedResponse<CampaignDto>>("/marketing", { params });
  return data;
}

export async function createCampaign(payload: Partial<CampaignDto>) {
  const { data } = await client.post<CampaignDto>("/marketing", payload);
  return data;
}

export async function updateCampaign(id: string, payload: Partial<CampaignDto>) {
  const { data } = await client.put<CampaignDto>(`/marketing/${id}`, payload);
  return data;
}

export async function getCampaign(id: string) {
  const { data } = await client.get<CampaignDto>(`/marketing/${id}`);
  return data;
}

export async function deleteCampaign(id: string) {
  await client.delete(`/marketing/${id}`);
}
