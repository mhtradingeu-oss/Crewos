import { BrandInfo } from "@mh-os/shared";
import { api } from "./client";

export interface UserBrandResponse {
  hasBrand: boolean;
  brand?: BrandInfo;
}

export async function getCurrentUserPrimaryBrand(): Promise<UserBrandResponse> {
  try {
    const { data } = await api.get<UserBrandResponse>("/brand/me");
    return data;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[user-brand] failed to resolve brand context", err);
    }
    return { hasBrand: false };
  }
}
