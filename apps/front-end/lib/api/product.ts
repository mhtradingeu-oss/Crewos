import { api } from "./client";
import type { PaginatedResponse } from "./types";

export interface ProductDto {
  id: string;
  brandId?: string | null;
  categoryId?: string;
  name: string;
  slug: string;
  description?: string | null;
  sku?: string | null;
  status?: string | null;
  barcode?: string;
  createdAt: string;
  updatedAt: string;
  inventoryItemCount?: number;
}

export async function listProducts(params?: {
  search?: string;
  brandId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}) {
  const { data } = await api.get<PaginatedResponse<ProductDto>>("/product", { params });
  return data;
}

export async function getProduct(id: string) {
  const { data } = await api.get<ProductDto>(`/product/${id}`);
  return data;
}

export async function createProduct(payload: Partial<ProductDto> & { name: string; slug: string }) {
  const { data } = await api.post<ProductDto>("/product", payload);
  return data;
}

export async function updateProduct(id: string, payload: Partial<ProductDto>) {
  const { data } = await api.put<ProductDto>(`/product/${id}`, payload);
  return data;
}

export async function removeProduct(id: string) {
  await api.delete(`/product/${id}`);
  return true;
}

export interface ProductInsightDto {
  id: string;
  summary: string;
  details: string;
  createdAt: string;
  updatedAt: string;
}

export async function getProductInsight(productId: string) {
  const { data } = await api.get<ProductInsightDto | null>(`/product/${productId}/ai/insight`);
  return data;
}

export async function createProductInsight(
  productId: string,
  payload: { brandId: string; forceRegenerate?: boolean },
) {
  const { data } = await api.post<ProductInsightDto>(
    `/product/${productId}/ai/insight`,
    payload,
  );
  return data;
}
