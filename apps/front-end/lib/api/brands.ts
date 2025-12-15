// Brands API (read-only, presenter layer)
// No business/AI/decision/automation logic. No hooks. No side effects.
// All imports explicit, ESM, alias-based.

import { apiFetch } from '@/lib/api/client.ts';
import type { Brand, ApiListResponse } from '@/lib/api/types.ts';

  // V1 READ-ONLY: Only GET is supported
  const { data } = await apiFetch<ApiListResponse<Brand>>('/api/v1/brand');
  return data ?? { items: [], total: 0 };
}

  // V1 READ-ONLY: Only GET is supported
  const { data } = await apiFetch<Brand>(`/api/v1/brand/${id}`);
  return data ?? null;
}
