import type { Prisma } from "@prisma/client";
import { prisma } from "../../core/prisma.js";
import { badRequest, notFound } from "../../core/http/errors.js";
import { buildPagination } from "../../core/utils/pagination.js";
import { logger } from "../../core/logger.js";
import { runAIRequest } from "../../core/ai-service/ai-client.js";
import {
  emitBrandSpike,
  emitMentionIngested,
  emitMentionSpike,
  emitSocialInsightGenerated,
  emitTrendDetected,
  emitTrendUpdated,
} from "./social-intelligence.events.js";
import {
  CompetitorSocialReportRecord,
  CreateInfluencerInput,
  CreateTrendInput,
  IngestMentionInput,
  IngestTrendInput,
  InfluencerRecord,
  PaginatedResponse,
  SocialAISummaryInput,
  SocialAISummaryResult,
  SocialMentionRecord,
  SocialTrendRecord,
  SocialInsightResult,
  UpdateInfluencerInput,
  UpdateTrendInput,
} from "./social-intelligence.types.js";

const SPIKE_WINDOW_HOURS = 6;
const SPIKE_THRESHOLD = 10;

const mentionSelect = {
  id: true,
  brandId: true,
  platform: true,
  author: true,
  keyword: true,
  content: true,
  sentiment: true,
  url: true,
  occurredAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.SocialMentionSelect;

const influencerSelect = {
  id: true,
  brandId: true,
  handle: true,
  platform: true,
  followers: true,
  engagementRate: true,
  profileUrl: true,
  tags: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.InfluencerProfileSelect;

const trendSelect = {
  id: true,
  brandId: true,
  topic: true,
  platform: true,
  score: true,
  trendDataJson: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.SocialTrendSelect;

const competitorSelect = {
  id: true,
  brandId: true,
  competitor: true,
  period: true,
  summary: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.CompetitorSocialReportSelect;

const aiInsightSelect = {
  id: true,
  brandId: true,
  os: true,
  entityType: true,
  entityId: true,
  summary: true,
  details: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.AIInsightSelect;

class SocialIntelligenceService {
    // Stub: Detect mention spike (implement logic as needed)
    private async detectMentionSpike(mention: any): Promise<void> {
      // TODO: Implement spike detection logic
      return;
    }

    // Stub: Build social insight prompt (implement logic as needed)
    private buildSocialInsightPrompt(brandId: string, mentions: any[], trends: any[], competitorReports: any[]): string {
      // TODO: Implement prompt building logic
      return `Brand: ${brandId}\nMentions: ${mentions.length}\nTrends: ${trends.length}\nCompetitor Reports: ${competitorReports.length}`;
    }

    // Stub: Extract actions from details (implement logic as needed)
    private extractActions(details: string): string[] {
      // TODO: Implement action extraction logic
      return [];
    }
  constructor(private readonly db = prisma) {}

    private resolvePagination(params: { page?: number; pageSize?: number }) {
      const page = Math.max(1, params.page ?? 1);
      const pageSize = Math.min(params.pageSize ?? 20, 100);
      const { skip, take } = buildPagination({ page, pageSize });
      return { page, pageSize: take, skip, take };
    }

  async listMentions(params: {
    brandId?: string;
    platform?: string;
    sentiment?: string;
    keyword?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }): Promise<PaginatedResponse<SocialMentionRecord>> {
    const { brandId, platform, sentiment, search, keyword } = params;
    const { page, pageSize, skip, take } = this.resolvePagination(params);
    const where: Prisma.SocialMentionWhereInput = {};
    if (brandId) where.brandId = brandId;
    if (platform) where.platform = platform;
    if (sentiment) where.sentiment = sentiment;
    if (keyword) where.keyword = keyword;
    if (search) {
      where.OR = [
        { author: { contains: search, mode: "insensitive" } },
        { content: { contains: search, mode: "insensitive" } },
      ];
    }
    const [total, rows] = await this.db.$transaction([
      this.db.socialMention.count({ where }),
      this.db.socialMention.findMany({
        where,
        select: mentionSelect,
        orderBy: { occurredAt: "desc" },
        skip,
        take,
      }),
    ]);
    return { items: rows.map((row) => this.mapMention(row)), total, page, pageSize };
  }

  async getMention(id: string): Promise<SocialMentionRecord> {
    const record = await this.db.socialMention.findUnique({ where: { id }, select: mentionSelect });
    if (!record) throw notFound("Mention not found");
    return this.mapMention(record);
  }

  async ingestMention(input: IngestMentionInput): Promise<SocialMentionRecord> {
    if (!input.brandId) throw badRequest("brandId is required");
    const mention = await this.db.socialMention.create({
      data: {
        brandId: input.brandId,
        platform: input.platform,
        author: input.author ?? null,
        keyword: input.keyword ?? null,
        content: input.content ?? null,
        sentiment: input.sentiment ?? null,
        url: input.url ?? null,
        occurredAt: input.occurredAt ?? new Date(),
      },
      select: mentionSelect,
    });

    await emitMentionIngested({
      brandId: mention.brandId ?? undefined,
      entityType: "mention",
      entityId: mention.id,
      action: "ingested",
      metadata: {
        platform: mention.platform,
        keyword: mention.keyword,
        sentiment: mention.sentiment,
      },
    });

    await this.detectMentionSpike(mention);
    return this.mapMention(mention);
  }

  async listInfluencers(params: {
    brandId?: string;
    platform?: string;
    tag?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }): Promise<PaginatedResponse<InfluencerRecord>> {
    const { brandId, platform, tag, search } = params;
    const { page, pageSize, skip, take } = this.resolvePagination(params);
    const where: Prisma.InfluencerProfileWhereInput = {};
    if (brandId) where.brandId = brandId;
    if (platform) where.platform = platform;
    if (tag) where.tags = { contains: tag, mode: "insensitive" };
    if (search) {
      where.OR = [
        { handle: { contains: search, mode: "insensitive" } },
        { profileUrl: { contains: search, mode: "insensitive" } },
      ];
    }
    const [total, rows] = await this.db.$transaction([
      this.db.influencerProfile.count({ where }),
      this.db.influencerProfile.findMany({
        where,
        select: influencerSelect,
        orderBy: { followers: "desc" },
        skip,
        take,
      }),
    ]);
    return { items: rows.map((row) => this.mapInfluencer(row)), total, page, pageSize };
  }

  async createInfluencer(input: CreateInfluencerInput): Promise<InfluencerRecord> {
    if (!input.handle || !input.platform) throw badRequest("Handle and platform are required");
    const created = await this.db.influencerProfile.create({
      data: {
        brandId: input.brandId ?? null,
        handle: input.handle,
        platform: input.platform,
        followers: input.followers ?? null,
        engagementRate: input.engagementRate ?? null,
        profileUrl: input.profileUrl ?? null,
        tags: input.tags ?? null,
      },
      select: influencerSelect,
    });
    return this.mapInfluencer(created);
  }

  async updateInfluencer(id: string, input: UpdateInfluencerInput): Promise<InfluencerRecord> {
    const existing = await this.db.influencerProfile.findUnique({
      where: { id },
      select: influencerSelect,
    });
    if (!existing) throw notFound("Influencer not found");
    const updated = await this.db.influencerProfile.update({
      where: { id },
      data: {
        brandId: input.brandId ?? existing.brandId,
        handle: input.handle ?? existing.handle,
        platform: input.platform ?? existing.platform,
        followers: input.followers ?? existing.followers,
        engagementRate: input.engagementRate ?? existing.engagementRate,
        profileUrl: input.profileUrl ?? existing.profileUrl,
        tags: input.tags ?? existing.tags,
      },
      select: influencerSelect,
    });
    return this.mapInfluencer(updated);
  }

  async deleteInfluencer(id: string) {
    const existing = await this.db.influencerProfile.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) throw notFound("Influencer not found");
    await this.db.influencerProfile.delete({ where: { id } });
    return { id };
  }

  async listTrends(params: {
    brandId?: string;
    platform?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }): Promise<PaginatedResponse<SocialTrendRecord>> {
    const { brandId, platform, search } = params;
    const { page, pageSize, skip, take } = this.resolvePagination(params);
    const where: Prisma.SocialTrendWhereInput = {};
    if (brandId) where.brandId = brandId;
    if (platform) where.platform = platform;
    if (search) where.topic = { contains: search, mode: "insensitive" };
    const [total, rows] = await this.db.$transaction([
      this.db.socialTrend.count({ where }),
      this.db.socialTrend.findMany({
        where,
        select: trendSelect,
        orderBy: { score: "desc" },
        skip,
        take,
      }),
    ]);
    return { items: rows.map((row) => this.mapTrend(row)), total, page, pageSize };
  }

  async createTrend(input: CreateTrendInput): Promise<SocialTrendRecord> {
    if (!input.topic) throw badRequest("Trend topic is required");
    const created = await this.db.socialTrend.create({
      data: {
        brandId: input.brandId ?? null,
        topic: input.topic,
        platform: input.platform ?? null,
        score: input.score ?? null,
        trendDataJson: input.trendData ? JSON.stringify(input.trendData) : null,
      },
      select: trendSelect,
    });
    await emitTrendDetected({
      brandId: created.brandId ?? undefined,
      entityType: "trend",
      entityId: created.id,
      action: "detected",
      metadata: { topic: created.topic, platform: created.platform, score: created.score },
    });
    return this.mapTrend(created);
  }

  async ingestTrend(input: IngestTrendInput): Promise<SocialTrendRecord> {
    if (!input.brandId) throw badRequest("brandId is required");
    const existing = await this.db.socialTrend.findFirst({
      where: { brandId: input.brandId, topic: input.topic, platform: input.platform ?? undefined },
      select: trendSelect,
    });

    if (existing) {
      const updated = await this.db.socialTrend.update({
        where: { id: existing.id },
        data: {
          score: input.score ?? existing.score,
          trendDataJson:
            input.trendData !== undefined
              ? JSON.stringify(input.trendData)
              : existing.trendDataJson,
        },
        select: trendSelect,
      });
      await emitTrendUpdated({
        brandId: updated.brandId ?? undefined,
        entityType: "trend",
        entityId: updated.id,
        action: "updated",
        metadata: {
          topic: updated.topic,
          platform: updated.platform,
          previousScore: existing.score,
          score: updated.score,
        },
      });
      return this.mapTrend(updated);
    }

    const created = await this.db.socialTrend.create({
      data: {
        brandId: input.brandId,
        topic: input.topic,
        platform: input.platform ?? null,
        score: input.score ?? null,
        trendDataJson: input.trendData ? JSON.stringify(input.trendData) : null,
      },
      select: trendSelect,
    });
    await emitTrendDetected({
      brandId: created.brandId ?? undefined,
      entityType: "trend",
      entityId: created.id,
      action: "detected",
      metadata: { topic: created.topic, platform: created.platform, score: created.score },
    });
    return this.mapTrend(created);
  }

  async updateTrend(id: string, input: UpdateTrendInput): Promise<SocialTrendRecord> {
    const existing = await this.db.socialTrend.findUnique({ where: { id }, select: trendSelect });
    if (!existing) throw notFound("Trend not found");
    const updated = await this.db.socialTrend.update({
      where: { id },
      data: {
        brandId: input.brandId ?? existing.brandId,
        topic: input.topic ?? existing.topic,
        platform: input.platform ?? existing.platform,
        score: input.score ?? existing.score,
        trendDataJson:
          input.trendData !== undefined
            ? JSON.stringify(input.trendData)
            : existing.trendDataJson,
      },
      select: trendSelect,
    });
    await emitTrendUpdated({
      brandId: updated.brandId ?? undefined,
      entityType: "trend",
      entityId: updated.id,
      action: "updated",
      metadata: {
        topic: updated.topic,
        platform: updated.platform,
        previousScore: existing.score,
        score: updated.score,
      },
    });
    return this.mapTrend(updated);
  }

  async deleteTrend(id: string) {
    const existing = await this.db.socialTrend.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) throw notFound("Trend not found");
    await this.db.socialTrend.delete({ where: { id } });
    return { id };
  }

  async listCompetitorReports(params: {
    brandId?: string;
    competitor?: string;
    page?: number;
    pageSize?: number;
  }): Promise<PaginatedResponse<CompetitorSocialReportRecord>> {
    const { brandId, competitor } = params;
    const { page, pageSize, skip, take } = this.resolvePagination(params);
    const where: Prisma.CompetitorSocialReportWhereInput = {};
    if (brandId) where.brandId = brandId;
    if (competitor) where.competitor = { contains: competitor, mode: "insensitive" };
    const [total, rows] = await this.db.$transaction([
      this.db.competitorSocialReport.count({ where }),
      this.db.competitorSocialReport.findMany({
        where,
        select: competitorSelect,
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
    ]);
    return { items: rows.map((row) => this.mapCompetitorReport(row)), total, page, pageSize };
  }

  async getInsight(brandId: string, entityType: string, entityId: string) {
    const insight = await this.db.aIInsight.findFirst({
      where: { brandId, os: "social", entityType, entityId },
      orderBy: { updatedAt: "desc" },
      select: aiInsightSelect,
    });
    if (!insight) throw notFound("Insight not found");
    return {
      id: insight.id,
      summary: insight.summary ?? "",
      details: insight.details ?? "",
      createdAt: insight.createdAt,
      updatedAt: insight.updatedAt,
    };
  }

  async summarizeAI(payload: SocialAISummaryInput): Promise<SocialAISummaryResult> {
    const prompt = this.buildPrompt(payload);
    const response = await runAIRequest({
      model: process.env.AI_MODEL_MHOS ?? "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content: "You are the MH-OS social intelligence analyst. Provide high-level summaries.",
        },
        { role: "user", content: prompt },
      ],
    });
    const details =
      response.success && response.content
        ? response.content.trim()
        : "AI summary is unavailable right now.";
    const summary = this.extractSummary(details);
    const insight = await this.db.aIInsight.create({
      data: {
        brandId: payload.brandId,
        os: "social",
        entityType: payload.entityType,
        entityId: payload.entityId ?? null,
        summary,
        details,
      },
      select: aiInsightSelect,
    });
    logger.info(`[social-intelligence] Created AI insight ${insight.id}`);
    return {
      id: insight.id,
      summary: insight.summary ?? summary,
      details: insight.details ?? details,
      createdAt: insight.createdAt,
      updatedAt: insight.updatedAt,
    };
  }

  async generateSocialInsight(brandId: string): Promise<SocialInsightResult> {
    const [mentions, trends, competitorReports] = await Promise.all([
      this.db.socialMention.findMany({
        where: { brandId },
        orderBy: { occurredAt: "desc" },
        take: 20,
        select: mentionSelect,
      }),
      this.db.socialTrend.findMany({
        where: { brandId },
        orderBy: { updatedAt: "desc" },
        take: 10,
        select: trendSelect,
      }),
      this.db.competitorSocialReport.findMany({
        where: { brandId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: competitorSelect,
      }),
    ]);

    const prompt = this.buildSocialInsightPrompt(brandId, mentions, trends, competitorReports);
    const response = await runAIRequest({
      model: process.env.AI_MODEL_MHOS ?? "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are the MH-OS Social Intelligence analyst. Provide concise insights for marketing and automation.",
        },
        { role: "user", content: prompt },
      ],
    });

    const details =
      response.success && response.content
        ? response.content.trim()
        : "No AI insight available at this time.";
    const summary = this.extractSummary(details);
    const suggestedActions = this.extractActions(details);

    const insight = await this.db.aIInsight.create({
      data: {
        brandId,
        os: "social-intel",
        entityType: "brand",
        entityId: brandId,
        summary,
        details,
      },
      select: aiInsightSelect,
    });

    await emitSocialInsightGenerated({
      brandId,
      entityType: "brand",
      entityId: brandId,
      action: "generated",
      metadata: { insightId: insight.id },
    });

    return {
      id: insight.id,
      brandId,
      summary,
      details,
      suggestedActions,
      generatedAt: insight.createdAt,
    };
  }

  private mapMention(record: Prisma.SocialMentionGetPayload<{ select: typeof mentionSelect }>) {
    return {
      id: record.id,
      brandId: record.brandId ?? null,
      platform: record.platform,
      author: record.author ?? null,
      keyword: record.keyword ?? null,
      content: record.content ?? null,
      sentiment: record.sentiment ?? null,
      url: record.url ?? null,
      occurredAt: record.occurredAt ?? null,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  private mapInfluencer(
    record: Prisma.InfluencerProfileGetPayload<{ select: typeof influencerSelect }>,
  ): InfluencerRecord {
    return {
      id: record.id,
      brandId: record.brandId ?? null,
      handle: record.handle,
      platform: record.platform,
      followers: record.followers ?? null,
      engagementRate: record.engagementRate ?? null,
      profileUrl: record.profileUrl ?? null,
      tags: record.tags ?? null,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  private mapTrend(record: Prisma.SocialTrendGetPayload<{ select: typeof trendSelect }>) {
    return {
      id: record.id,
      brandId: record.brandId ?? null,
      topic: record.topic,
      platform: record.platform ?? null,
      score: record.score ?? null,
      trendData: record.trendDataJson ? JSON.parse(record.trendDataJson) : null,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  private mapCompetitorReport(
    record: Prisma.CompetitorSocialReportGetPayload<{ select: typeof competitorSelect }>,
  ): CompetitorSocialReportRecord {
    return {
      id: record.id,
      brandId: record.brandId ?? null,
      competitor: record.competitor ?? null,
      period: record.period ?? null,
      summary: record.summary ?? null,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  private buildPrompt(payload: SocialAISummaryInput) {
    const lines = [
      `Brand: ${payload.brandId}`,
      `Entity Type: ${payload.entityType}`,
      `Entity ID: ${payload.entityId ?? "unspecified"}`,
      `Context: ${payload.context ?? "None"}`,
      "Summarize sentiment, trends, and suggested actions in bullet points.",
    ];
    return lines.join("\n");
  }

  private extractSummary(details: string) {
    const trimmed = details.trim();
    if (!trimmed) return "Summary not available";
    const [firstLine = ""] = trimmed.split("\n");
    return firstLine.replace(/^summary:\s*/i, "").trim() || trimmed;
  }
}

export const social_intelligenceService = new SocialIntelligenceService();
