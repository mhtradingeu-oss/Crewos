import type {
  PricingRecordDto,
  PricingDraftCreateDto,
  CompetitorPriceCreateDto,
  PricingLogEntryDto,
  PricingSuggestionOutputDto,
  PricingSuggestionInputDto,
  PricingPlanInputDto,
  PricingPlanOutputDto,
  CreatePricingInputDto,
  UpdatePricingInputDto,
} from "@mh-os/shared";
import { client } from "./client";
import type { PaginatedResponse } from "./types";

export type PricingDto = PricingRecordDto;
export type PricingDraftDto = PricingDraftCreateDto & {
  id: string;
  productId: string;
  status?: string;
  statusReason?: string;
  createdAt: string;
  updatedAt: string;
};
export type CompetitorPriceDto = CompetitorPriceCreateDto & {
  id: string;
  createdAt: string;
  updatedAt: string;
  productId: string;
};
export type PricingLogDto = PricingLogEntryDto;

export async function listPricing(params?: {
  productId?: string;
  brandId?: string;
  page?: number;
  pageSize?: number;
}) {
  const { data } = await api.get<PaginatedResponse<PricingDto>>("/pricing", { params });
  return data;
}

export async function getPricing(id: string) {
  const { data } = await api.get<PricingDto>(`/pricing/${id}`);
  return data;
}

export async function createPricing(payload: CreatePricingInputDto) {
  const { data } = await api.post<PricingDto>("/pricing", payload);
  return data;
}

export async function updatePricing(id: string, payload: UpdatePricingInputDto) {
  const { data } = await api.put<PricingDto>(`/pricing/${id}`, payload);
  return data;
}

export async function removePricing(id: string) {
  await api.delete(`/pricing/${id}`);
  return true;
}

export async function getPricingByProduct(productId: string) {
  const { data } = await api.get<PaginatedResponse<PricingDto>>("/pricing", {
    params: { productId, page: 1, pageSize: 1 },
  });
  return data.data[0] ?? null;
}

export async function listDrafts(productId: string) {
  const { data } = await api.get<PaginatedResponse<PricingDraftDto>>(
    `/pricing/product/${productId}/drafts`,
  );
  return data;
}

export async function createDraft(productId: string, payload: PricingDraftCreateDto) {
  const { data } = await api.post<PricingDraftDto>(`/pricing/product/${productId}/drafts`, payload);
  return data;
}

export async function listCompetitors(productId: string) {
  const { data } = await api.get<PaginatedResponse<CompetitorPriceDto>>(
    `/pricing/product/${productId}/competitors`,
  );
  return data;
}

export async function addCompetitor(productId: string, payload: CompetitorPriceCreateDto) {
  const { data } = await api.post<CompetitorPriceDto>(
    `/pricing/product/${productId}/competitors`,
    payload,
  );
  return data;
}

export async function listLogs(productId: string) {
  const { data } = await api.get<PaginatedResponse<PricingLogDto>>(
    `/pricing/product/${productId}/logs`,
  );
  return data;
}

export type PricingAISuggestionDto = PricingSuggestionOutputDto;

export async function getAIPricingSuggestion(
  productId: string,
  input?: PricingSuggestionInputDto,
): Promise<PricingAISuggestionDto> {
  const { data } = await api.post<PricingAISuggestionDto>(
    `/pricing/product/${productId}/ai/suggest`,
    input ?? {},
  );
  const payload = data as PricingAISuggestionDto & { suggestionJson?: PricingAISuggestionDto };
  return payload.suggestionJson ?? payload;
}

export async function approveDraft(
  productId: string,
  draftId: string,
  payload?: { approvedById?: string },
) {
  const { data } = await api.post<PricingDraftDto>(
    `/pricing/product/${productId}/drafts/${draftId}/approve`,
    payload ?? {},
  );
  return data;
}

export async function rejectDraft(productId: string, draftId: string, payload?: { reason?: string }) {
  const { data } = await api.post<PricingDraftDto>(
    `/pricing/product/${productId}/drafts/${draftId}/reject`,
    payload ?? {},
  );
  return data;
}

export async function aiPlan(productId: string, input?: PricingPlanInputDto) {
  const { data } = await api.post<PricingPlanOutputDto>(`/pricing/product/${productId}/ai/plan`, input ?? {});
  return data;
}
