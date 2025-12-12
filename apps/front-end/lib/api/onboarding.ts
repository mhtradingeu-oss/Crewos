import { client } from "./client";
import type {
  BrandCreatedResponse,
  BrandDefinitionDTO,
  MarketingPlanDTO,
  OnboardingStartResponse,
  ProductCreatedResponse,
  ProductDTO,
  ProductEntry,
  ProductPricingDTO,
  PricingSetupDTO,
} from "@/types/onboarding.types";
import type {
  OnboardingCompleteDto,
  OnboardingGoalsDto,
  OnboardingPersonaDto,
  OnboardingPlanSuggestionDto,
  OnboardingStartDto,
} from "@mh-os/shared";

/**
 * Placeholder API clients that call the onboarding backend endpoints.
 */
export async function fetchExistingProducts() {
  const { data } = await client.get<ProductEntry[]>("/products");
  return data;
}

export async function fetchBrandProducts(brandId: string) {
  const { data } = await client.get<ProductEntry[]>(`/products/brand/${brandId}`);
  return data;
}

export async function createBrand(payload: BrandDefinitionDTO) {
  const { data } = await client.post<BrandCreatedResponse>("/brand", payload);
  return data;
}

export async function createProducts(brandId: string, products: ProductDTO[]) {
  const { data } = await client.post<ProductCreatedResponse[]>(`/brand/${brandId}/products`, {
    products,
  });
  return data;
}

export async function previewPricing(payload: PricingSetupDTO) {
  const { data } = await client.post("/pricing/preview", payload);
  return data;
}

export async function createPricingDrafts(brandId: string, pricing: ProductPricingDTO[]) {
  const { data } = await client.post(`/pricing/drafts`, {
    brandId,
    pricing,
  });
  return data;
}

export async function createMarketingPlan(brandId: string, plan: MarketingPlanDTO) {
  const { data } = await client.post(`/marketing/content-plan`, {
    brandId,
    plan,
  });
  return data;
}

// New F2 onboarding endpoints
export async function getOnboardingStart() {
  const { data } = await client.get<OnboardingStartDto>("/onboarding/start");
  return data as OnboardingStartResponse;
}

export async function postOnboardingPersona(payload: OnboardingPersonaDto) {
  await client.post("/onboarding/persona", payload);
  return payload;
}

export async function postOnboardingGoals(payload: OnboardingGoalsDto) {
  await api.post("/onboarding/goals", payload);
  return payload;
}

export async function getOnboardingPlanSuggestion() {
  const { data } = await api.get<OnboardingPlanSuggestionDto>("/onboarding/plan-suggestion");
  return data;
}

export async function completeOnboarding(payload: OnboardingCompleteDto = {}) {
  await api.post("/onboarding/complete", payload);
}
