import { api } from "./client";
import type { PaginatedResponse } from "./types";

export interface LoyaltyCustomerDto {
  id: string;
  brandId?: string;
  programId: string;
  userId?: string;
  personId?: string;
  pointsBalance: number;
  tier?: string;
  createdAt: string;
  updatedAt: string;
}

export async function listLoyaltyCustomers(params?: {
  brandId?: string;
  programId?: string;
  page?: number;
  pageSize?: number;
}) {
  const { data } = await api.get<PaginatedResponse<LoyaltyCustomerDto>>("/loyalty", { params });
  return data;
}

export async function updateLoyaltyCustomer(
  id: string,
  payload: Partial<LoyaltyCustomerDto> & { pointsDelta?: number; reason?: string },
) {
  const { data } = await api.put<LoyaltyCustomerDto>(`/loyalty/${id}`, payload);
  return data;
}
