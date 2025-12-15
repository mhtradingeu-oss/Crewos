
// Typed fetch wrapper for API client (read-only, stateless)
// No business/AI/decision/automation logic. No hooks. No side effects.
// All imports explicit, ESM, alias-based.

export interface ApiClientOptions {
  method?: 'GET'; // Only GET allowed
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

import { normalizeApiError } from '@/lib/api/errors.ts';

export async function apiFetch<T>(
  url: string,
  options: ApiClientOptions = {}
): Promise<T> {
  const res = await fetch(url, {
    method: options.method || 'GET',
    headers: options.headers,
    signal: options.signal,
    credentials: 'include',
    cache: 'no-store',
  });
  if (!res.ok) {
    // Defer to error normalization
    throw await normalizeApiError(res);
  }
  return res.json() as Promise<T>;
}
