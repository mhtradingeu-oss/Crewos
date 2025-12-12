import { client } from "./client";
import type { PaginatedResponse } from "./types";

export interface FinanceDto {
  id: string;
  brandId?: string;
  productId?: string;
  channel?: string;
  amount?: number | null;
  currency?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function listFinance(params?: {
  brandId?: string;
  productId?: string;
  page?: number;
  pageSize?: number;
}) {
  const { data } = await client.get<PaginatedResponse<FinanceDto>>("/finance", { params });
  return data;
}
