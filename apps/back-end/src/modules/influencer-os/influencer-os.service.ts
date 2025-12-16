import type { Prisma } from "@prisma/client";
import { prisma } from "../../core/prisma.js";
import { badRequest, notFound } from "../../core/http/errors.js";
import { buildPagination } from "../../core/utils/pagination.js";
import type { InfluencerCandidate } from "../../core/ai/engines/influencer.engine.js";
import { runInfluencerEngine } from "../../core/ai/engines/influencer.engine.js";

export type InfluencerScoreRecord = {
  id: string;
  brandId?: string | null;
  handle: string;
  displayName?: string | null;
  platform: string;
  followers?: number | null;
  engagementRate?: number | null;
  fakeFollowerRisk?: number | null;
  marketFitScore?: number | null;
  authenticityScore?: number | null;
  category?: string | null;
  country?: string | null;
  language?: string | null;
  tags?: string | null;
  status?: string | null;
  riskNotes?: string | null;
  score: number;
  scoreBreakdown: {
    engagement: number;
    marketFit: number;
    authenticity: number;
    fakeFollowerRisk: number;
  };
  latestStat?: Prisma.InfluencerStatSnapshotGetPayload<{ select: typeof statSelect }> | null;
};

type ActionContext = {
  brandId?: string;
  actorUserId?: string;
  tenantId?: string;
};

const statSelect = {
  id: true,
  followers: true,
  engagementRate: true,
  fakeFollowerPct: true,
  audienceMatchScore: true,
  marketFitScore: true,
  authenticityScore: true,
  metricsJson: true,
  collectedAt: true,
} satisfies Prisma.InfluencerStatSnapshotSelect;

class InfluencerOSService {
  constructor(private readonly db = prisma) {}

  async discover(
    input: {
      brandId?: string;
      query?: string;
      categories?: string[];
      platforms?: string[];
      audience?: string;
      limit?: number;
    },
    context?: ActionContext,
  ) {
    const brandId = context?.brandId ?? input.brandId ?? null;
    const limit = input.limit ?? 10;
    const simulated = this.simulateDiscovery(input.platforms, input.categories, limit);

    const task = await this.db.influencerDiscoveryTask.create({
      data: {
        brandId,
        query: input.query ?? null,
        categories: input.categories?.join(",") ?? null,
        platforms: input.platforms?.join(",") ?? null,
        status: "completed",
        resultCount: simulated.length,
        findingsJson: JSON.stringify(simulated),
        requestedByUserId: context?.actorUserId ?? null,
      },
    });

    const influencers: InfluencerScoreRecord[] = [];
    for (const row of simulated) {
      const existing = await this.db.influencerProfile.findFirst({
        where: { handle: row.handle, platform: row.platform, brandId },
        select: { id: true },
      });

      const profile = existing
        ? await this.db.influencerProfile.update({
            where: { id: existing.id },
            data: {
              followers: row.followers,
              engagementRate: row.engagementRate,
              fakeFollowerRisk: row.fakeFollowerRisk,
              marketFitScore: row.marketFitScore,
              authenticityScore: row.authenticityScore,
              category: row.category,
              country: row.country,
              language: row.language,
              tags: row.tags?.join(", ") ?? null,
              displayName: row.displayName,
              profileUrl: row.profileUrl,
              riskNotes: row.riskNotes,
              brandId,
            },
            include: { statSnapshots: { select: statSelect, orderBy: { collectedAt: "desc" }, take: 1 } },
          })
        : await this.db.influencerProfile.create({
            data: {
              brandId,
              handle: row.handle,
              displayName: row.displayName ?? row.handle,
              platform: row.platform,
              followers: row.followers,
              engagementRate: row.engagementRate,
              fakeFollowerRisk: row.fakeFollowerRisk,
              marketFitScore: row.marketFitScore,
              authenticityScore: row.authenticityScore,
              category: row.category,
              country: row.country,
              language: row.language,
              contactEmail: row.contactEmail,
              tags: row.tags?.join(", ") ?? null,
              profileUrl: row.profileUrl,
              riskNotes: row.riskNotes,
            },
            include: { statSnapshots: { select: statSelect, orderBy: { collectedAt: "desc" }, take: 1 } },
          });

      await this.db.influencerStatSnapshot.create({
        data: {
          influencerId: profile.id,
          brandId,
          followers: row.followers,
          engagementRate: row.engagementRate,
          fakeFollowerPct: row.fakeFollowerRisk,
          marketFitScore: row.marketFitScore,
          authenticityScore: row.authenticityScore,
          metricsJson: row.metricsJson ? JSON.stringify(row.metricsJson) : null,
        },
      });

      influencers.push(this.mapProfile(profile, profile.statSnapshots?.[0] ?? null));
    }

    return { taskId: task.id, influencers, sources: ["TikTok Open API", "YouTube Data API", "Instagram Basic API"] };
  }

  async listScores(
    params: { brandId?: string; platform?: string; category?: string; search?: string; page?: number; pageSize?: number },
    context?: ActionContext,
  ) {
    const brandId = context?.brandId ?? params.brandId;
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;
    const { skip, take } = buildPagination({ page, pageSize });
    const where: Prisma.InfluencerProfileWhereInput = {};
    if (brandId) where.brandId = brandId;
    if (params.platform) where.platform = params.platform;
    if (params.category) where.category = { contains: params.category, mode: "insensitive" };
    if (params.search) {
      where.OR = [
        { handle: { contains: params.search, mode: "insensitive" } },
        { displayName: { contains: params.search, mode: "insensitive" } },
        { tags: { contains: params.search, mode: "insensitive" } },
      ];
    }

    const [total, rows] = await this.db.$transaction([
      this.db.influencerProfile.count({ where }),
      this.db.influencerProfile.findMany({
        where,
        include: { statSnapshots: { select: statSelect, orderBy: { collectedAt: "desc" }, take: 1 } },
        orderBy: { followers: "desc" },
        skip,
        take,
      }),
    ]);

    return {
      items: rows.map((row: any) => this.mapProfile(row, row.statSnapshots?.[0] ?? null)),
      total,
      page,
      pageSize: take,
    };
  }

  async recommend(
    input: { brandId?: string; category?: string; goal?: string; audience?: string; topN?: number },
    context?: ActionContext,
  ) {
    const scores = await this.listScores(
      { brandId: input.brandId, category: input.category, pageSize: Math.max(10, input.topN ?? 10) },
      context,
    );
    if (!scores.items.length) {
      throw badRequest("No influencers available for recommendations");
    }
    const candidates: InfluencerCandidate[] = scores.items.map((item) => ({
      influencerId: item.id,
      handle: item.handle,
      platform: item.platform,
      followers: item.followers,
      engagementRate: item.engagementRate,
      fakeFollowerRisk: item.fakeFollowerRisk,
      marketFitScore: item.marketFitScore,
      authenticityScore: item.authenticityScore,
      category: item.category,
      country: item.country,
    }));

    const engineOutput = await runInfluencerEngine(
      {
        brandId: context?.brandId ?? input.brandId ?? (scores.items[0]?.brandId ?? ""),
        goal: input.goal,
        audience: input.audience,
        category: input.category,
        candidates,
      },
      { actor: { permissions: [], role: "SYSTEM" } },
    );

    const ranked = engineOutput.rankings.map((rank) => {
      const profile = scores.items.find((p) => p.id === rank.influencerId);
      return {
        influencerId: rank.influencerId,
        handle: profile?.handle ?? rank.influencerId,
        platform: profile?.platform,
        score: rank.score,
        predictedSalesImpact: rank.predictedSalesImpact,
        reason: rank.reason,
        profile,
      };
    });

    return {
      goal: input.goal,
      audience: input.audience,
      recommendations: ranked,
      outreachDrafts: engineOutput.outreachDrafts,
      negotiation: engineOutput.negotiation,
      pipeline: engineOutput.pipeline,
    };
  }

  async createNegotiation(
    input: { brandId?: string; influencerId: string; goal?: string; offer?: string; tone?: string },
    context?: ActionContext,
  ) {
    const influencer = await this.db.influencerProfile.findUnique({
      where: { id: input.influencerId },
      include: { statSnapshots: { select: statSelect, orderBy: { collectedAt: "desc" }, take: 1 } },
    });
    if (!influencer) throw notFound("Influencer not found");
    if (context?.brandId && influencer.brandId && influencer.brandId !== context.brandId) {
      throw badRequest("Influencer belongs to another brand");
    }

    const candidate: InfluencerCandidate = {
      influencerId: influencer.id,
      handle: influencer.handle,
      platform: influencer.platform,
      followers: influencer.followers,
      engagementRate: influencer.engagementRate,
      fakeFollowerRisk: influencer.fakeFollowerRisk,
      marketFitScore: influencer.marketFitScore,
      authenticityScore: influencer.authenticityScore,
      category: influencer.category,
      country: influencer.country,
    };

    const engineOutput = await runInfluencerEngine(
      {
        brandId: context?.brandId ?? influencer.brandId ?? "",
        goal: input.goal,
        candidates: [candidate],
      },
      { actor: { permissions: [], role: "SYSTEM" }, task: "NEGOTIATION" },
    );

    const suggestions = engineOutput.negotiation[0]?.suggestions ?? ["Lead with value", "Clarify deliverables"];

    const negotiation = await this.db.influencerNegotiation.create({
      data: {
        brandId: context?.brandId ?? influencer.brandId,
        influencerId: influencer.id,
        status: "draft",
        lastSuggestedAt: new Date(),
        termsJson: JSON.stringify({ goal: input.goal, offer: input.offer, suggestions }),
        notes: input.offer ?? null,
      },
      include: { influencer: true },
    });

    return {
      negotiation,
      suggestions,
      outreachDrafts: engineOutput.outreachDrafts,
      pipeline: engineOutput.pipeline,
    };
  }

  async listNegotiations(
    params: { brandId?: string; page?: number; pageSize?: number },
    context?: ActionContext,
  ) {
    const brandId = context?.brandId ?? params.brandId;
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;
    const { skip, take } = buildPagination({ page, pageSize });
    const where: Prisma.InfluencerNegotiationWhereInput = {};
    if (brandId) where.brandId = brandId;

    const [total, rows] = await this.db.$transaction([
      this.db.influencerNegotiation.count({ where }),
      this.db.influencerNegotiation.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        include: { influencer: true },
        skip,
        take,
      }),
    ]);

    return { items: rows, total, page, pageSize: take };
  }

  async createCampaignLink(
    input: {
      brandId?: string;
      influencerId: string;
      campaignId?: string;
      role?: string;
      trackingUrl?: string;
      status?: string;
      performance?: Record<string, unknown>;
    },
    context?: ActionContext,
  ) {
    const brandId = context?.brandId ?? input.brandId ?? null;
    const influencer = await this.db.influencerProfile.findUnique({ where: { id: input.influencerId } });
    if (!influencer) throw notFound("Influencer not found");
    if (brandId && influencer.brandId && influencer.brandId !== brandId) {
      throw badRequest("Influencer belongs to another brand");
    }

    if (input.campaignId) {
      const campaignExists = await this.db.campaign.findUnique({ where: { id: input.campaignId } });
      if (!campaignExists) throw notFound("Campaign not found");
    }

    const link = await this.db.influencerCampaignLink.create({
      data: {
        brandId,
        influencerId: influencer.id,
        campaignId: input.campaignId ?? null,
        role: input.role ?? null,
        trackingUrl: input.trackingUrl ?? null,
        status: input.status ?? "active",
        performanceJson: input.performance ? JSON.stringify(input.performance) : null,
      },
      include: { influencer: true, campaign: true },
    });

    return link;
  }

  async listCampaignLinks(
    params: { brandId?: string; status?: string; page?: number; pageSize?: number },
    context?: ActionContext,
  ) {
    const brandId = context?.brandId ?? params.brandId;
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;
    const { skip, take } = buildPagination({ page, pageSize });
    const where: Prisma.InfluencerCampaignLinkWhereInput = {};
    if (brandId) where.brandId = brandId;
    if (params.status) where.status = params.status;

    const [total, rows] = await this.db.$transaction([
      this.db.influencerCampaignLink.count({ where }),
      this.db.influencerCampaignLink.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        include: { influencer: true, campaign: true },
        skip,
        take,
      }),
    ]);

    return { items: rows, total, page, pageSize: take };
  }

  private mapProfile(
    profile: Prisma.InfluencerProfileGetPayload<{ include: { statSnapshots: { select: typeof statSelect; orderBy: { collectedAt: "desc" }; take: 1 } } }> & {
      statSnapshots?: Prisma.InfluencerStatSnapshotGetPayload<{ select: typeof statSelect }>[];
    },
    stat: Prisma.InfluencerStatSnapshotGetPayload<{ select: typeof statSelect }> | null,
  ): InfluencerScoreRecord {
    const breakdown = this.computeBreakdown(profile, stat ?? undefined);
    return {
      id: profile.id,
      brandId: profile.brandId ?? undefined,
      handle: profile.handle,
      displayName: profile.displayName,
      platform: profile.platform,
      followers: profile.followers,
      engagementRate: stat?.engagementRate ?? profile.engagementRate,
      fakeFollowerRisk: stat?.fakeFollowerPct ?? profile.fakeFollowerRisk,
      marketFitScore: stat?.marketFitScore ?? profile.marketFitScore,
      authenticityScore: stat?.authenticityScore ?? profile.authenticityScore,
      category: profile.category,
      country: profile.country,
      language: profile.language,
      tags: profile.tags,
      status: profile.status,
      riskNotes: profile.riskNotes,
      score: breakdown.score,
      scoreBreakdown: breakdown.breakdown,
      latestStat: stat ?? profile.statSnapshots?.[0] ?? undefined,
    };
  }

  private computeBreakdown(
    profile: { engagementRate?: number | null; marketFitScore?: number | null; authenticityScore?: number | null; fakeFollowerRisk?: number | null },
    stat?: { engagementRate?: number | null; marketFitScore?: number | null; authenticityScore?: number | null; fakeFollowerPct?: number | null },
  ) {
    const engagement = (stat?.engagementRate ?? profile.engagementRate ?? 0) / 10;
    const marketFit = (stat?.marketFitScore ?? profile.marketFitScore ?? 0) / 10;
    const authenticity = (stat?.authenticityScore ?? profile.authenticityScore ?? 0.5);
    const fakeRisk = stat?.fakeFollowerPct ?? profile.fakeFollowerRisk ?? 0;
    const score = Math.round(
      Math.max(0, Math.min(100, (0.35 * marketFit + 0.3 * engagement + 0.2 * authenticity + 0.15 * (1 - fakeRisk)) * 100)),
    );
    return {
      score,
      breakdown: {
        engagement: Number((engagement * 100).toFixed(1)),
        marketFit: Number((marketFit * 100).toFixed(1)),
        authenticity: Number((authenticity * 100).toFixed(1)),
        fakeFollowerRisk: Number(((fakeRisk ?? 0) * 100).toFixed(1)),
      },
    };
  }

  private simulateDiscovery(platforms?: string[], categories?: string[], limit = 10) {
    const pool = [
      {
        platform: "tiktok",
        handle: "@hairstudio",
        displayName: "Hair Studio",
        followers: 250000,
        engagementRate: 4.2,
        fakeFollowerRisk: 0.08,
        marketFitScore: 0.82,
        authenticityScore: 0.76,
        category: "beauty",
        country: "DE",
        language: "de",
        contactEmail: "collab@hairstudio.example",
        tags: ["beauty", "tutorial"],
        profileUrl: "https://www.tiktok.com/@hairstudio",
        metricsJson: { source: "TikTok Open API" },
        riskNotes: "Manual review recommended",
      },
      {
        platform: "youtube",
        handle: "@techroutes",
        displayName: "Tech Routes",
        followers: 180000,
        engagementRate: 3.1,
        fakeFollowerRisk: 0.05,
        marketFitScore: 0.78,
        authenticityScore: 0.84,
        category: "electronics",
        country: "US",
        language: "en",
        contactEmail: "team@techroutes.example",
        tags: ["tech", "reviews"],
        profileUrl: "https://www.youtube.com/@techroutes",
        metricsJson: { source: "YouTube Data API" },
        riskNotes: "High authenticity from comment quality",
      },
      {
        platform: "instagram",
        handle: "@citytaste",
        displayName: "City Taste",
        followers: 120000,
        engagementRate: 5.0,
        fakeFollowerRisk: 0.12,
        marketFitScore: 0.74,
        authenticityScore: 0.7,
        category: "food",
        country: "FR",
        language: "fr",
        contactEmail: "hello@citytaste.example",
        tags: ["food", "travel"],
        profileUrl: "https://www.instagram.com/citytaste",
        metricsJson: { source: "Instagram Basic API" },
        riskNotes: "Monitor follower spikes",
      },
    ];

    const filtered = pool.filter((p) => {
      const platformAllowed = !platforms?.length || platforms.includes(p.platform);
      const categoryAllowed = !categories?.length || categories.includes(p.category ?? "");
      return platformAllowed && categoryAllowed;
    });

    const source = filtered.length ? filtered : pool;
    if (source.length === 0) return [];

    const results: typeof pool = [];
    for (let i = 0; i < limit; i++) {
      results.push(source[i % source.length]!);
    }
    return results;
  }
}

export const influencerOSService = new InfluencerOSService();
