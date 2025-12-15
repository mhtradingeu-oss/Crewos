
// Loyalty API (read-only, presenter layer)
// No business/AI/decision/automation logic. No hooks. No side effects.
// All imports explicit, ESM, alias-based.

import { apiFetch } from '@/lib/api/client.ts';
import type { LoyaltyStatus } from '@/lib/api/types.ts';

export async function getLoyaltyStatus(userId: string): Promise<LoyaltyStatus> {
  return apiFetch<LoyaltyStatus>(`/api/v1/loyalty/status/${userId}`);
}
