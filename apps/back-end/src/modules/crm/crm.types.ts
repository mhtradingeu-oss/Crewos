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
  customerId?: string;
}

export interface CrmLeadEventPayload {
  leadId: string;
  brandId?: string;
  status?: string | null;
  ownerId?: string | null;
  sourceId?: string | null;
  score?: number | null;
}

export interface CrmContactEventPayload {
  leadId: string;
  brandId?: string;
  ownerId?: string | null;
  notes?: string | null;
}

export interface CrmCustomerEventPayload {
  leadId: string;
  brandId?: string;
  ownerId?: string | null;
  customerId: string;
  orderId?: string | null;
  revenueRecordId?: string | null;
  notes?: string | null;
}

export interface CrmCustomerRecord {
  id: string;
  leadId: string;
  brandId?: string | null;
  personId?: string | null;
  companyId?: string | null;
  firstOrderId?: string | null;
  firstRevenueRecordId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConvertLeadToContactInput {
  ownerId?: string;
  notes?: string;
}

export interface ConvertLeadToCustomerInput {
  ownerId?: string;
  orderId?: string;
  revenueRecordId?: string;
  notes?: string;
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
