import type { Prisma } from "@prisma/client";
import { prisma } from "../../prisma.js";

const campaignSelect = {
  id: true,
  brandId: true,
  channelId: true,
  name: true,
  objective: true,
  budget: true,
  status: true,
  targetSegmentIds: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.CampaignSelect;

const campaignTargetSegmentSelect = {
  id: true,
  brandId: true,
  targetSegmentIds: true,
} satisfies Prisma.CampaignSelect;

const campaignAttributionSelect = {
  id: true,
  campaignId: true,
  brandId: true,
  leadId: true,
  customerId: true,
  source: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.CampaignLeadAttributionSelect;

const campaignInteractionSelect = {
  id: true,
  campaignId: true,
  type: true,
  leadId: true,
  customerId: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.CampaignInteractionSelect;

export type CampaignPayload = Prisma.CampaignGetPayload<{ select: typeof campaignSelect }>;
export type CampaignTargetSegmentPayload = Prisma.CampaignGetPayload<{
  select: typeof campaignTargetSegmentSelect;
}>;
export type CampaignAttributionPayload = Prisma.CampaignLeadAttributionGetPayload<{
  select: typeof campaignAttributionSelect;
}>;
export type CampaignInteractionPayload = Prisma.CampaignInteractionGetPayload<{
  select: typeof campaignInteractionSelect;
}>;

export type CampaignWhereInput = Prisma.CampaignWhereInput;
export type CampaignCreateInput = Prisma.CampaignCreateInput;
export type CampaignUpdateInput = Prisma.CampaignUpdateInput;
export type MarketingPerformanceLogCreateInput = Prisma.MarketingPerformanceLogCreateInput;
export type AIInsightCreateInput = Prisma.AIInsightCreateInput;
export type NullableJsonNullValueInput = Prisma.NullableJsonNullValueInput;
export type JsonValue = Prisma.JsonValue;
export type InputJsonValue = Prisma.InputJsonValue;

async function listCampaigns(where: CampaignWhereInput, skip: number, take: number) {
  const filteredWhere = where ?? {};
  return prisma.$transaction([
    prisma.campaign.count({ where: filteredWhere }),
    prisma.campaign.findMany({
      where: filteredWhere,
      select: campaignSelect,
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
  ]);
}

async function findCampaignById(id: string) {
  return prisma.campaign.findUnique({ where: { id }, select: campaignSelect });
}

async function findCampaign(where: CampaignWhereInput) {
  return prisma.campaign.findFirst({ where, select: campaignSelect });
}

async function findCampaignTargetSegments(campaignId: string) {
  return prisma.campaign.findUnique({
    where: { id: campaignId },
    select: campaignTargetSegmentSelect,
  });
}

async function findCampaignsByBrand(brandId?: string | null) {
  return prisma.campaign.findMany({
    where: { brandId: brandId ?? null },
    select: { id: true, name: true },
  });
}

async function createCampaign(data: CampaignCreateInput) {
  return prisma.campaign.create({ data, select: campaignSelect });
}

async function updateCampaign(id: string, data: CampaignUpdateInput) {
  return prisma.campaign.update({ where: { id }, data, select: campaignSelect });
}

async function deleteCampaign(id: string) {
  await prisma.campaign.delete({ where: { id } });
}

async function logPerformance(data: MarketingPerformanceLogCreateInput) {
  await prisma.marketingPerformanceLog.create({ data });
}

async function findLeadById(leadId: string) {
  return prisma.lead.findUnique({
    where: { id: leadId },
    select: { brandId: true },
  });
}

async function findCustomerById(customerId: string) {
  return prisma.crmCustomer.findUnique({
    where: { id: customerId },
    select: { brandId: true },
  });
}

async function createCampaignAttribution(data: Prisma.CampaignLeadAttributionCreateInput) {
  return prisma.campaignLeadAttribution.create({ data, select: campaignAttributionSelect });
}

async function createCampaignInteraction(data: Prisma.CampaignInteractionCreateInput) {
  return prisma.campaignInteraction.create({ data, select: campaignInteractionSelect });
}

async function logAIInsight(data: AIInsightCreateInput) {
  await prisma.aIInsight.create({ data });
}

export const marketingRepository = {
  campaignSelect,
  campaignAttributionSelect,
  campaignInteractionSelect,
  listCampaigns,
  findCampaignById,
  findCampaign,
  findCampaignTargetSegments,
  findCampaignsByBrand,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  logPerformance,
  findLeadById,
  findCustomerById,
  createCampaignAttribution,
  createCampaignInteraction,
  logAIInsight,
};
