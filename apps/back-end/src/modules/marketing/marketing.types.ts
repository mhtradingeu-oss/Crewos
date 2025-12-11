export interface CreateMarketingInput {
  brandId?: string;
  channelId?: string;
  name: string;
  objective?: string;
  budget?: number;
  status?: string;
  targetSegmentIds?: string[];
}

export interface UpdateMarketingInput extends Partial<CreateMarketingInput> {}

export interface CampaignRecord {
  id: string;
  brandId?: string;
  channelId?: string;
  name: string;
  objective?: string;
  budget?: number | null;
  status?: string | null;
  targetSegmentIds?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MarketingCampaignEventPayload {
  id: string;
  brandId?: string;
  channelId?: string | null;
  status?: string | null;
  targetSegmentIds?: string[];
}

export interface LeadPreview {
  id: string;
  name?: string;
  email?: string;
  score?: number | null;
  status?: string | null;
}

export interface CampaignSegmentPreview {
  segmentId: string;
  segmentName?: string;
  total: number;
  sample: LeadPreview[];
}

export interface CampaignTargetPreview {
  campaignId: string;
  totalLeads: number;
  segments: CampaignSegmentPreview[];
}
