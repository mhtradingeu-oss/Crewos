import { apiFetch } from "./client.ts";
import type { PaginatedResponse } from "./types.ts";

export interface BrandDto {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  // V1 READ-ONLY: List brands
  export async function listBrands(): Promise<BrandDto[]> {
    const { data } = await apiFetch<PaginatedResponse<BrandDto>>("/brand");
    return data?.items ?? [];
  }

  // V1 READ-ONLY: Get single brand
  export async function getBrand(id: string): Promise<BrandDto | null> {
    const { data } = await apiFetch<BrandDto>(`/brand/${id}`);
    return data ?? null;
  }

  // V1 READ-ONLY: Get brand identity
  export async function getBrandIdentity(id: string): Promise<BrandIdentityDto | null> {
    const { data } = await apiFetch<BrandIdentityDto>(`/brand/${id}/identity`);
    return data ?? null;
  }

  // V1 READ-ONLY: Get brand rules
  export async function getBrandRules(id: string): Promise<BrandRulesDto | null> {
    const { data } = await apiFetch<BrandRulesDto>(`/brand/${id}/rules`);
    return data ?? null;
  }

  // V1 READ-ONLY: Get brand AI config
  export async function getBrandAiConfig(id: string): Promise<BrandAiConfigDto | null> {
    const { data } = await apiFetch<BrandAiConfigDto>(`/brand/${id}/ai/config`);
    return data ?? null;
  }

  // V1 READ-ONLY STUB: Create brand (disabled)
  export async function createBrand(): Promise<null> {
    // V1 READ-ONLY STUB
    return null;
  }

  // V1 READ-ONLY STUB: Update brand (disabled)
  export async function updateBrand(): Promise<null> {
    // V1 READ-ONLY STUB
    return null;
  }

  // V1 READ-ONLY STUB: Delete brand (disabled)
  export async function deleteBrand(): Promise<null> {
    // V1 READ-ONLY STUB
    return null;
  }

  // V1 READ-ONLY STUB: Refresh brand identity (disabled)
  export async function refreshBrandIdentity(): Promise<null> {
    // V1 READ-ONLY STUB
    return null;
  }
      page: payload.page ?? 1,
      pageSize: payload.pageSize ?? ((payload.items as T[])?.length ?? 0),
    };
  }
  return payload as PaginatedResponse<T>;
}

  // V1 READ-ONLY: Only GET is supported
  const { data } = await apiFetch<PaginatedResponse<BrandDto>>(`/brand`);
  return data?.items ?? [];
}

  // V1 READ-ONLY: Only GET is supported
  const { data } = await apiFetch<BrandDto>(`/brand/${id}`);
  return data ?? null;
}

  // V1 READ-ONLY STUB
  return null;
}

  // V1 READ-ONLY STUB
  return null;
}

  // V1 READ-ONLY STUB
  return null;
}

  // V1 READ-ONLY: Only GET is supported
  const { data } = await apiFetch<BrandIdentityDto>(`/brand/${id}/identity`);
  return data ?? null;
}

  // V1 READ-ONLY STUB
  return null;
}

  id: string,
  payload?: { forceRegenerate?: boolean },
): Promise<null> {
  // V1 READ-ONLY STUB
  return null;
}

  id: string,
  payload?: { forceRegenerate?: boolean },
): Promise<null> {
  // V1 READ-ONLY STUB
  return null;
}

  // V1 READ-ONLY: Only GET is supported
  const { data } = await apiFetch<BrandRulesDto>(`/brand/${id}/rules`);
  return data ?? null;
}

  // V1 READ-ONLY STUB
  return null;
}

  // V1 READ-ONLY: Only GET is supported
  const { data } = await apiFetch<BrandAiConfigDto>(`/brand/${id}/ai/config`);
  return data ?? null;
}

  // V1 READ-ONLY STUB
  return null;
}
