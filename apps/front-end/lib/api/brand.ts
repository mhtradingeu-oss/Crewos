import { api } from "./client.ts";
import type { PaginatedResponse } from "./types.ts";

export interface BrandDto {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  countryOfOrigin?: string | null;
  defaultCurrency?: string | null;
  settings?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface BrandIdentityDto {
  brandId: string;
  vision?: string;
  mission?: string;
  values?: string;
  toneOfVoice?: string;
  persona?: string;
  brandStory?: string;
  keywords?: string;
  colorPalette?: string;
  packagingStyle?: string;
  socialProfiles?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface BrandIdentityPayload {
  vision?: string | null;
  mission?: string | null;
  values?: string | null;
  toneOfVoice?: string | null;
  persona?: string | null;
  brandStory?: string | null;
  keywords?: string | null;
  colorPalette?: string | null;
  packagingStyle?: string | null;
  socialProfiles?: Record<string, string> | null;
}

export interface BrandAiIdentityResponse {
  id: string;
  summary: string;
  details: string;
  createdAt: string;
  updatedAt: string;
}

export interface BrandRulesDto {
  brandId: string;
  namingRules?: string | null;
  descriptionRules?: string | null;
  marketingRules?: string | null;
  discountRules?: string | null;
  pricingConstraints?: string | null;
  restrictedWords?: string | null;
  allowedWords?: string | null;
  aiRestrictions?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BrandAiConfigDto {
  brandId: string;
  aiPersonality?: string | null;
  aiTone?: string | null;
  aiContentStyle?: string | null;
  aiPricingStyle?: string | null;
  aiEnabledActions?: string[] | null;
  aiBlockedTopics?: string[] | null;
  aiModelVersion?: string | null;
  createdAt: string;
  updatedAt: string;
}

function normalizePaginated<T>(payload: any): PaginatedResponse<T> {
  if (payload && "items" in payload) {
    return {
      data: (payload.items as T[]) ?? [],
      total: payload.total ?? ((payload.items as T[])?.length ?? 0),
      page: payload.page ?? 1,
      pageSize: payload.pageSize ?? ((payload.items as T[])?.length ?? 0),
    };
  }
  return payload as PaginatedResponse<T>;
}

export async function listBrands(params?: { search?: string; page?: number; pageSize?: number }) {
  const { data } = await api.get<PaginatedResponse<BrandDto> | { items: BrandDto[]; total: number; page: number; pageSize: number }>("/brand", { params });
  return normalizePaginated<BrandDto>(data);
}

export async function getBrand(id: string) {
  const { data } = await api.get<BrandDto>(`/brand/${id}`);
  return data;
}

export async function createBrand(payload: Partial<BrandDto> & { name: string; slug: string }) {
  const { data } = await api.post<BrandDto>("/brand", payload);
  return data;
}

export async function updateBrand(id: string, payload: Partial<BrandDto>) {
  const { data } = await api.put<BrandDto>(`/brand/${id}`, payload);
  return data;
}

export async function removeBrand(id: string) {
  await api.delete(`/brand/${id}`);
  return true;
}

export async function getBrandIdentity(id: string) {
  const { data } = await api.get<BrandIdentityDto | null>(`/brand/${id}/identity`);
  return data;
}

export async function updateBrandIdentity(id: string, payload: BrandIdentityPayload) {
  const { data } = await api.put<BrandIdentityDto>(`/brand/${id}/identity`, payload);
  return data;
}

export async function refreshBrandAiIdentity(
  id: string,
  payload?: { forceRegenerate?: boolean },
) {
  const { data } = await api.post<BrandAiIdentityResponse>(`/brand/${id}/ai/identity`, payload ?? {});
  return data;
}

export async function refreshBrandRulesAi(
  id: string,
  payload?: { forceRegenerate?: boolean },
) {
  const { data } = await api.post<BrandAiIdentityResponse>(`/brand/${id}/ai/rules`, payload ?? {});
  return data;
}

export async function getBrandRules(id: string) {
  const { data } = await api.get<BrandRulesDto | null>(`/brand/${id}/rules`);
  return data;
}

export async function updateBrandRules(id: string, payload: Partial<BrandRulesDto>) {
  const { data } = await api.put<BrandRulesDto>(`/brand/${id}/rules`, payload);
  return data;
}

export async function getBrandAiConfig(id: string) {
  const { data } = await api.get<BrandAiConfigDto | null>(`/brand/${id}/ai/config`);
  return data;
}

export async function updateBrandAiConfig(id: string, payload: Partial<BrandAiConfigDto>) {
  const { data } = await api.put<BrandAiConfigDto>(`/brand/${id}/ai/config`, payload);
  return data;
}
