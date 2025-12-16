// AI Brain DTOs migrated from backend

export interface CreateAiBrainInput {
  brandId: string;
  scope?: string;
  highlights?: string[];
  notes?: string;
  summary?: string;
  metrics?: Record<string, unknown>;
  createReport?: boolean;
}

export interface UpdateAiBrainInput extends Partial<CreateAiBrainInput> {}

export interface AiBrainEventPayload {
  id: string;
}

export interface AiBaseInput {
  brandId?: string;
  locale?: string;
  agentName?: string;
}

export interface PricingSuggestionInput extends AiBaseInput {
  productId?: string;
  productName?: string;
  currentPrice?: number | null;
  competitorSummary?: string;
}

export interface PricingSuggestionOutput {
  suggestedPrice: number | null;
  reasoning: string;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  competitorSummary?: string;
  confidenceScore?: number;
}

export interface CampaignIdeasInput extends AiBaseInput {
  goal: string;
  audience?: string;
  channels?: string[];
}

export interface CampaignIdeasOutput {
  headline: string;
  body: string;
  cta?: string;
  keywords?: string[];
}

export interface LeadFollowupInput extends AiBaseInput {
  leadName: string;
  intent?: string;
  lastInteraction?: string;
}

export interface LeadFollowupOutput {
  summary: string;
}
