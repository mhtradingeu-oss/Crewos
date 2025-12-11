/**
 * TODO: replace with real API call once the backend exposes /api/v1/brand/me.
 */
export async function getCurrentUserPrimaryBrand(): Promise<{
  hasBrand: boolean;
  brandId?: string;
}> {
  // placeholder flag until backend integration is ready
  return { hasBrand: false };
}
