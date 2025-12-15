// Brands API (read-only, presenter layer)
// No business/AI/decision/automation logic. No hooks. No side effects.
// All imports explicit, ESM, alias-based.

import { apiFetch } from '@/lib/api/client.ts';
import type { Brand, ApiListResponse } from '@/lib/api/types.ts';

export async function listBrands(): Promise<ApiListResponse<Brand>> {
  return apiFetch<ApiListResponse<Brand>>('/api/v1/brand');
}

export async function getBrand(id: string): Promise<Brand> {
  return apiFetch<Brand>(`/api/v1/brand/${id}`);
}
