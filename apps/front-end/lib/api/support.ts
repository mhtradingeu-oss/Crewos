import { api } from "./client";
import type { PaginatedResponse } from "./types";

export interface SupportTicketDto {
  id: string;
  subject: string;
  status: string;
  priority?: string;
  assignee?: string | null;
  channel?: string | null;
  customer?: string | null;
  slaBreached?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SupportAiSummaryDto {
  severity: string;
  sentiment: string;
  intent: string;
  nextActions: string[];
}

export async function listSupportTickets(params?: {
  status?: string;
  priority?: string;
  page?: number;
  pageSize?: number;
}) {
  const { data } = await api.get<PaginatedResponse<SupportTicketDto>>("/support/tickets", { params });
  return data;
}

export async function getSupportTicket(id: string) {
  const { data } = await api.get<SupportTicketDto>(`/support/tickets/${id}`);
  return data;
}

export async function getSupportAiSummary(id: string) {
  const { data } = await api.get<SupportAiSummaryDto>(`/support/tickets/${id}/ai`);
  return data;
}
