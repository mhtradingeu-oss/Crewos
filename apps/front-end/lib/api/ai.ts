// V1 PLACEHOLDER — EXECUTION DISABLED
// All API logic is disabled for V1 read-only build.
import type {
  BrandDefinitionInput,
  BrandIdentity,
  BrandIdentityAIResponse,
  MarketingPlanDTO,
  MarketingChannel,
  OnboardingLearningPayload,
  PricingStrategy,
  ProductDTO,
  ProductPricingDTO,
} from "@/types/onboarding.types";

export type AIJournalEntryType = "INSIGHT" | "LEARNING" | "DECISION";

export interface AIJournalEntry {
  id: string;
  title: string;
  summary: string;
  type: AIJournalEntryType;
  createdAt: string;
  tags?: string[];
}

/**
 * Central AI helpers for legacy endpoints and the new orchestrator contracts.
 */
export async function fetchAiInsights(_payload: { brandName?: string; highlights?: string }): Promise<null> {
  return null;
}

export async function listAiJournal(): Promise<AIJournalEntry[]> {
  return [];
}

export async function generateMarketing(_payload: { goal: string; tone?: string; audience?: string }): Promise<null> {
  return null;
}

export async function generateSeo(payload: { topic: string; locale?: string }) {
  const { data } = await api.post(`/marketing/ai/seo`, payload);
  return data;
}

export async function generateCaptions(payload: { topic: string; platform?: string; tone?: string }) {
  const { data } = await api.post(`/marketing/ai/captions`, payload);
  return data;
}

export async function scoreLead(payload: { leadName: string; intent?: string }) {
  const { data } = await api.post(`/crm/ai/score`, payload);
  return data;
}

/**
 * Specialized orchestrator calls that comply with the AI brain endpoints.
 */
export async function generateBrandIdentity(payload: BrandDefinitionInput) {
  const { data } = await api.post<BrandIdentityAIResponse>("/ai-brain/insights", {
    os: "branding",
    entityType: "brand",
    entityId: null,
    payload,
  });
  return data;
}

interface ProductDescriptionInput {
  productName: string;
  category: string;
  brandIdentity: BrandIdentityAIResponse;
}

interface ProductDescriptionOutput {
  description: string;
  usp?: string;
  bullets?: string[];
}

export async function generateProductDescription(input: ProductDescriptionInput) {
  const { data } = await api.post<ProductDescriptionOutput>("/ai-brain/insights", {
    os: "product",
    entityType: "product",
    entityId: null,
    payload: input,
  });
  return data;
}

interface AiPricingInput {
  product: ProductDTO;
  cogs: number;
  strategy: PricingStrategy;
  brandIdentity: BrandIdentityAIResponse;
  vatPct?: number;
}

export async function aiPricingEngine(payload: AiPricingInput) {
  const { data } = await api.post<ProductPricingDTO>("/ai-brain/insights", {
    os: "pricing",
    entityType: "product",
    entityId: payload.product.id ?? null,
    payload,
  });
  return data;
}

export async function generateMarketingStarterPlan(payload: {
  brandIdentity: BrandIdentityAIResponse;
  products: ProductDTO[];
  pricing: ProductPricingDTO[];
  channels: MarketingChannel[];
}) {
  const { data } = await api.post<MarketingPlanDTO>("/ai-brain/insights", {
    os: "marketing",
    entityType: "campaign",
    entityId: null,
    payload,
  });
  return data;
}

export async function logWizardLearning(payload: { summary: unknown }) {
  const { data } = await api.post("/ai-brain/learning", payload);
  return data;
}

export async function logOnboardingLearning(payload: OnboardingLearningPayload) {
  const { data } = await api.post("/ai-brain/learning", {
    scope: "onboarding",
    ...payload,
  });
  return data;
}
