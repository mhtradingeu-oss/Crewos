export interface CreateLeadInput {
  brandId?: string;
  name?: string;
  email?: string;
  phone?: string;
  status?: string;
  ownerId?: string;
  sourceId?: string;
}

export interface UpdateLeadInput extends Partial<CreateLeadInput> {}

export interface LeadRecord {
  id: string;
  brandId?: string | null;
  status?: string;
  ownerId?: string;
  sourceId?: string;
  name?: string;
  email?: string;
  phone?: string;
  companyName?: string | null;
  score?: number | null;
  dealCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CrmLeadEventPayload {
  leadId: string;
  brandId?: string;
  status?: string | null;
  ownerId?: string | null;
  sourceId?: string | null;
  score?: number | null;
}

export interface CrmLeadScoredEventPayload {
  leadId: string;
  brandId?: string;
  score: number;
  probability?: number | null;
  nextAction?: string | null;
}

export interface CrmSegmentFilter {
  statuses?: string[];
  sourceIds?: string[];
  ownerIds?: string[];
  minScore?: number;
  maxScore?: number;
  createdAfter?: string;
  createdBefore?: string;
}

export interface CrmSegmentCreateInput {
  brandId?: string;
  name: string;
  filter?: CrmSegmentFilter;
}

export interface CrmSegmentUpdateInput extends Partial<CrmSegmentCreateInput> {}

export interface CrmSegmentRecord {
  id: string;
  brandId?: string;
  name: string;
  filter?: CrmSegmentFilter;
  createdAt: Date;
  updatedAt: Date;
}

export interface CrmSegmentLeadsResult {
  segmentId: string;
  total: number;
  leads: LeadRecord[];
}
