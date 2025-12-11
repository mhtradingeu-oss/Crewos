/**
 * Shared DTOs for the onboarding wizard flow.
 */

export type PathChoice = "existing" | "new" | "whiteLabel";
export type StrategyOption = "Premium" | "Competitive" | "Penetration" | "AI recommended";

export type PersonaChoice = string;
export type OnboardingGoal = string;
export type OnboardingStatus = "in_progress" | "completed";

export interface PlanSuggestion {
  planName: string;
  focus: string[];
  rationale: string;
  features?: string[];
}

export interface OnboardingPlanSuggestionResponse {
  plan: "free" | "starter" | "pro" | "enterprise";
  features: string[];
}

export interface BrandDefinitionInput {
  brandName: string;
  country: string;
  category: string;
  brandGoal: string;
}

export interface BrandIdentity {
  tone: string;
  persona: string;
  brandStory: string;
  keywords: string[];
  packagingStyle: string;
}

export type BrandIdentityAIResponse = BrandIdentity;

export interface BrandDefinitionDTO extends BrandDefinitionInput {
  aiIdentity: BrandIdentityAIResponse;
}

export interface ProductPayload {
  productName: string;
  baseProduct?: string;
  descriptionDraft: string;
}

export interface ProductDTO {
  id?: string;
  name: string;
  category: string;
  baseProductId?: string;
  description?: string;
  isNew?: boolean;
}

export type ProductEntry = ProductDTO;

export type PricingStrategy = "PREMIUM" | "COMPETITIVE" | "PENETRATION" | "AI";

export interface ProductPricingDTO {
  productIdOrTempId: string;
  cogs: number;
  strategy: PricingStrategy;
  b2cNet: number;
  b2cGross: number;
  dealerNet?: number;
  amazonNet?: number;
  uvpNet?: number;
  vatPct?: number;
  productId?: string;
}

export interface PricingSetupDTO {
  items: ProductPricingDTO[];
}

export interface PricingOutput {
  b2cNet: number;
  b2cGross: number;
  dealerNet: number;
  amazonNet: number;
  uvpNet: number;
  fullCost: number;
  vatPct: number;
}

export interface ProductSetupDTO {
  products: ProductDTO[];
}

export type MarketingChannel =
  | "instagram"
  | "tiktok"
  | "facebook"
  | "youtube"
  | "amazon"
  | "stands"
  | "email"
  | "website";

export interface MarketingPostDTO {
  channel: MarketingChannel;
  title: string;
  caption: string;
  suggestedMediaType: string;
  scheduleHint?: string;
}

export interface MarketingVideoIdeaDTO {
  channel: MarketingChannel;
  hook: string;
  scriptOutline: string;
  durationHint?: string;
}

export interface MarketingPlanDTO {
  posts: MarketingPostDTO[];
  videos: MarketingVideoIdeaDTO[];
  ideas: string[];
}

export interface OnboardingSummary {
  pathChoice?: PathChoice;
  persona?: PersonaChoice;
  goals?: OnboardingGoal[];
  planSuggestion?: PlanSuggestion;
  brandDefinition?: BrandDefinitionDTO;
  productSetup?: ProductSetupDTO;
  pricingSetup?: PricingSetupDTO;
  products: ProductEntry[];
  pricing?: PricingOutput;
  marketingPlan?: MarketingPlanDTO;
  finalizedBrandId?: string;
  wizardCompleted?: boolean;
  onboardingStatus?: OnboardingStatus;
}

export interface BrandCreatedResponse {
  brandId: string;
}

export interface ProductCreatedResponse {
  id: string;
  tempId?: string;
  name: string;
}

export interface OnboardingLearningPayload {
  brandId: string;
  pathChoice?: PathChoice;
  persona?: PersonaChoice;
  goals?: OnboardingGoal[];
  planSuggestion?: PlanSuggestion;
  brandDefinition: BrandDefinitionDTO;
  products: ProductCreatedResponse[];
  pricing: ProductPricingDTO[];
  marketingPlan?: MarketingPlanDTO;
}

export interface OnboardingStartResponse {
  persona: string | null;
  goals: string[];
  status: OnboardingStatus;
}
