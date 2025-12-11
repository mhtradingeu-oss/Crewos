/**
 * LOYALTY SERVICE — MH-OS v2
 * Spec: docs/os/11_loyalty-program.md (MASTER_INDEX)
 */
import type { Prisma } from "@prisma/client";
import { prisma } from "../../core/prisma.js";
import { badRequest, forbidden, notFound } from "../../core/http/errors.js";
import { buildPagination } from "../../core/utils/pagination.js";
import {
  emitLoyaltyCreated,
  emitLoyaltyRewardRedeemed,
  emitLoyaltyTierChanged,
} from "./loyalty.events.js";
import type {
  CreateLoyaltyInput,
  LoyaltyCustomerRecord,
  UpdateLoyaltyInput,
  LoyaltyProgramDTO,
  LoyaltyTierDTO,
  LoyaltyRewardDTO,
  CreateLoyaltyProgramInput,
  CreateLoyaltyTierInput,
  CreateLoyaltyRewardInput,
  RedeemRewardInput,
  RedeemRewardResult,
  LoyaltyDashboardSummary,
} from "./loyalty.types.js";

const programSelect = {
  id: true,
  brandId: true,
  name: true,
  description: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.LoyaltyProgramSelect;

const tierSelect = {
  id: true,
  brandId: true,
  programId: true,
  name: true,
  minPoints: true,
  maxPoints: true,
  benefitsDescription: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.LoyaltyTierSelect;

const rewardSelect = {
  id: true,
  brandId: true,
  programId: true,
  name: true,
  description: true,
  costPoints: true,
  pointsCost: true,
  rewardType: true,
  payloadJson: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.LoyaltyRewardSelect;

const customerSelect = {
  id: true,
  brandId: true,
  programId: true,
  userId: true,
  personId: true,
  pointsBalance: true,
  tierId: true,
  tier: true,
  tierInfo: {
    select: {
      id: true,
      name: true,
    },
  },
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.LoyaltyCustomerSelect;

type LoyaltyActionContext = { brandId?: string; actorUserId?: string };

function normalizePayload(value?: Record<string, unknown> | string | null) {
  if (!value) return null;
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

function mapProgram(
  record: Prisma.LoyaltyProgramGetPayload<{ select: typeof programSelect }>,
): LoyaltyProgramDTO {
  return {
    id: record.id,
    brandId: record.brandId ?? undefined,
    name: record.name,
    description: record.description ?? null,
    status: record.status ?? undefined,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function mapTier(record: Prisma.LoyaltyTierGetPayload<{ select: typeof tierSelect }>): LoyaltyTierDTO {
  return {
    id: record.id,
    brandId: record.brandId ?? undefined,
    programId: record.programId,
    name: record.name,
    minPoints: record.minPoints,
    maxPoints: record.maxPoints ?? null,
    benefitsDescription: record.benefitsDescription ?? null,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function mapReward(
  record: Prisma.LoyaltyRewardGetPayload<{ select: typeof rewardSelect }>,
): LoyaltyRewardDTO {
  return {
    id: record.id,
    brandId: record.brandId ?? undefined,
    programId: record.programId ?? undefined,
    name: record.name,
    description: record.description ?? null,
    pointsCost: record.pointsCost ?? record.costPoints ?? null,
    rewardType: record.rewardType ?? null,
    payloadJson: record.payloadJson ?? null,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function mapCustomer(record: Prisma.LoyaltyCustomerGetPayload<{ select: typeof customerSelect }>) {
  return {
    id: record.id,
    brandId: record.brandId ?? undefined,
    programId: record.programId,
    userId: record.userId ?? undefined,
    personId: record.personId ?? undefined,
    pointsBalance: record.pointsBalance,
    tierId: record.tierId ?? undefined,
    tier: record.tier ?? undefined,
    tierName: record.tierInfo?.name ?? undefined,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  } satisfies LoyaltyCustomerRecord;
}

class LoyaltyService {
  constructor(private readonly db = prisma) {}

  async dashboardSummary(brandId: string): Promise<LoyaltyDashboardSummary> {
    const programWhere: Prisma.LoyaltyProgramWhereInput = { brandId };
    const customerWhere: Prisma.LoyaltyCustomerWhereInput = { brandId };
    const rewardWhere: Prisma.LoyaltyRewardWhereInput = { brandId };

    const [programs, customerAgg, rewards, redemptionAgg] = await this.db.$transaction([
      this.db.loyaltyProgram.count({ where: programWhere }),
      this.db.loyaltyCustomer.aggregate({
        where: customerWhere,
        _count: { id: true },
        _sum: { pointsBalance: true },
      }),
      this.db.loyaltyReward.count({ where: rewardWhere }),
      this.db.rewardRedemption.aggregate({
        where: { program: { brandId } },
        _count: { id: true },
        _sum: { pointsSpent: true },
      }),
    ]);

    return {
      totalPrograms: programs,
      totalCustomers: customerAgg._count.id ?? 0,
      totalPoints: Number(customerAgg._sum.pointsBalance ?? 0),
      totalRewards: rewards,
      totalRedemptions: redemptionAgg._count.id ?? 0,
      pointsSpent: Number(redemptionAgg._sum.pointsSpent ?? 0),
    };
  }

  async list(
    params: { brandId?: string; programId?: string; page?: number; pageSize?: number } = {},
  ) {
    const { brandId, programId } = params;
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(params.pageSize ?? 20, 100);
    const { skip, take } = buildPagination({ page, pageSize });
    const where: Prisma.LoyaltyCustomerWhereInput = {};
    if (brandId) where.brandId = brandId;
    if (programId) where.programId = programId;

    const [total, rows] = await this.db.$transaction([
      this.db.loyaltyCustomer.count({ where }),
      this.db.loyaltyCustomer.findMany({
        where,
        select: customerSelect,
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
    ]);

    return {
      items: rows.map(mapCustomer),
      total,
      page,
      pageSize: take,
    };
  }

  async getById(id: string): Promise<LoyaltyCustomerRecord> {
    const record = await this.db.loyaltyCustomer.findUnique({
      where: { id },
      select: customerSelect,
    });
    if (!record) throw notFound("Loyalty customer not found");
    return mapCustomer(record);
  }

  async create(input: CreateLoyaltyInput): Promise<LoyaltyCustomerRecord> {
    if (!input.programId) throw badRequest("programId is required");
    const created = await this.db.loyaltyCustomer.create({
      data: {
        brandId: input.brandId ?? null,
        programId: input.programId,
        userId: input.userId ?? null,
        personId: input.personId ?? null,
        pointsBalance: input.pointsBalance ?? 0,
        tier: input.tier ?? null,
      },
      select: customerSelect,
    });
    await emitLoyaltyCreated(
      { id: created.id, brandId: created.brandId ?? undefined, programId: created.programId },
      { brandId: created.brandId ?? undefined, source: "api" },
    );
    return mapCustomer(created);
  }

  async update(id: string, input: UpdateLoyaltyInput): Promise<LoyaltyCustomerRecord> {
    const existing = await this.db.loyaltyCustomer.findUnique({
      where: { id },
      select: customerSelect,
    });
    if (!existing) throw notFound("Loyalty customer not found");

    const updated = await this.db.loyaltyCustomer.update({
      where: { id },
      data: {
        brandId: input.brandId ?? existing.brandId,
        programId: input.programId ?? existing.programId,
        userId: input.userId ?? existing.userId,
        personId: input.personId ?? existing.personId,
        tier: input.tier ?? existing.tier,
        pointsBalance: input.pointsBalance ?? existing.pointsBalance,
      },
      select: customerSelect,
    });

    if (input.pointsDelta && input.pointsDelta !== 0) {
      await this.adjustPoints(updated.id, input.pointsDelta, input.reason ?? "adjustment", {
        brandId: updated.brandId ?? undefined,
      });
    }

    return mapCustomer(updated);
  }

  async adjustPoints(
    customerId: string,
    delta: number,
    reason: string,
    context: LoyaltyActionContext = {},
  ) {
    const customer = await this.db.loyaltyCustomer.findUnique({
      where: { id: customerId },
      select: customerSelect,
    });
    if (!customer) throw notFound("Loyalty customer not found");

    await this.applyPointsDelta(
      { id: customer.id, brandId: customer.brandId, programId: customer.programId },
      delta,
      reason,
    );
    await this.resolveTierForCustomer(customerId, context);
  }

  async remove(id: string) {
    await this.db.loyaltyCustomer.delete({ where: { id } });
    return { id };
  }

  async listPrograms(
    context: LoyaltyActionContext = {},
    pagination: { page?: number; pageSize?: number } = {},
  ) {
    const where: Prisma.LoyaltyProgramWhereInput = {};
    if (context.brandId) where.brandId = context.brandId;

    const page = Math.max(1, pagination.page ?? 1);
    const pageSize = Math.min(pagination.pageSize ?? 20, 100);
    const { skip, take } = buildPagination({ page, pageSize });

    const [total, programs] = await this.db.$transaction([
      this.db.loyaltyProgram.count({ where }),
      this.db.loyaltyProgram.findMany({
        where,
        select: programSelect,
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
    ]);

    return {
      items: programs.map(mapProgram),
      total,
      page,
      pageSize: take,
    };
  }

  async createProgram(
    input: CreateLoyaltyProgramInput,
    context: LoyaltyActionContext = {},
  ): Promise<LoyaltyProgramDTO> {
    if (context.brandId && input.brandId && context.brandId !== input.brandId) {
      throw forbidden("Cannot create a program for another brand");
    }
    const brandId = context.brandId ?? input.brandId ?? null;
    const created = await this.db.loyaltyProgram.create({
      data: {
        brandId,
        name: input.name,
        description: input.description ?? null,
        status: input.status ?? "ACTIVE",
      },
      select: programSelect,
    });
    return mapProgram(created);
  }

  async listTiers(
    programId: string,
    context: LoyaltyActionContext = {},
    pagination: { page?: number; pageSize?: number } = {},
  ) {
    await this.ensureProgram(programId, context);

    const page = Math.max(1, pagination.page ?? 1);
    const pageSize = Math.min(pagination.pageSize ?? 20, 100);
    const { skip, take } = buildPagination({ page, pageSize });

    const [total, tiers] = await this.db.$transaction([
      this.db.loyaltyTier.count({ where: { programId } }),
      this.db.loyaltyTier.findMany({
        where: { programId },
        select: tierSelect,
        orderBy: { minPoints: "asc" },
        skip,
        take,
      }),
    ]);
    return {
      items: tiers.map(mapTier),
      total,
      page,
      pageSize: take,
    };
  }

  async createTier(
    programId: string,
    input: CreateLoyaltyTierInput,
    context: LoyaltyActionContext = {},
  ): Promise<LoyaltyTierDTO> {
    const program = await this.ensureProgram(programId, context);
    if (input.maxPoints != null && input.maxPoints < input.minPoints) {
      throw badRequest("maxPoints must be greater than or equal to minPoints");
    }
    const created = await this.db.loyaltyTier.create({
      data: {
        programId,
        brandId: program.brandId ?? null,
        name: input.name,
        minPoints: input.minPoints,
        maxPoints: input.maxPoints ?? null,
        benefitsDescription: input.benefitsDescription ?? null,
      },
      select: tierSelect,
    });
    return mapTier(created);
  }

  async listRewards(
    programId: string,
    context: LoyaltyActionContext = {},
    pagination: { page?: number; pageSize?: number } = {},
  ) {
    await this.ensureProgram(programId, context);

    const page = Math.max(1, pagination.page ?? 1);
    const pageSize = Math.min(pagination.pageSize ?? 20, 100);
    const { skip, take } = buildPagination({ page, pageSize });

    const [total, rewards] = await this.db.$transaction([
      this.db.loyaltyReward.count({ where: { programId } }),
      this.db.loyaltyReward.findMany({
        where: { programId },
        select: rewardSelect,
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
    ]);
    return {
      items: rewards.map(mapReward),
      total,
      page,
      pageSize: take,
    };
  }

  async createReward(
    programId: string,
    input: CreateLoyaltyRewardInput,
    context: LoyaltyActionContext = {},
  ): Promise<LoyaltyRewardDTO> {
    const program = await this.ensureProgram(programId, context);
    const created = await this.db.loyaltyReward.create({
      data: {
        programId,
        brandId: program.brandId ?? null,
        name: input.name,
        description: input.description ?? null,
        costPoints: input.pointsCost,
        pointsCost: input.pointsCost,
        rewardType: input.rewardType ?? null,
        payloadJson: normalizePayload(input.payloadJson),
      },
      select: rewardSelect,
    });
    return mapReward(created);
  }

  async redeemReward(
    rewardId: string,
    input: RedeemRewardInput,
    context: LoyaltyActionContext = {},
  ): Promise<RedeemRewardResult> {
    const reward = await this.db.loyaltyReward.findUnique({
      where: { id: rewardId },
      select: rewardSelect,
    });
    if (!reward) throw notFound("Reward not found");
    this.assertBrandAccess(reward.brandId, context.brandId);

    if (!reward.programId) {
      throw badRequest("Reward is not associated with a loyalty program");
    }

    const customer = await this.db.loyaltyCustomer.findUnique({
      where: { id: input.customerId },
      select: customerSelect,
    });
    if (!customer) throw notFound("Loyalty customer not found");
    this.assertBrandAccess(customer.brandId, context.brandId);
    if (customer.programId !== reward.programId) {
      throw badRequest("Customer does not belong to the reward's program");
    }

    const pointsCost = reward.pointsCost ?? reward.costPoints ?? 0;
    if (pointsCost > customer.pointsBalance) {
      throw badRequest("Customer does not have enough points");
    }

    const metadataJson = normalizePayload(input.metadata);

    const updated = await this.applyPointsDelta(
      { id: customer.id, brandId: customer.brandId, programId: customer.programId },
      -pointsCost,
      `reward:${reward.name}`,
      async (tx) => {
        await tx.rewardRedemption.create({
          data: {
            customerId: customer.id,
            rewardId,
            programId: reward.programId,
            pointsSpent: pointsCost,
            status: "COMPLETED",
            metadataJson,
          },
        });
      },
    );

    await emitLoyaltyRewardRedeemed(
      {
        brandId: customer.brandId ?? undefined,
        customerId: customer.id,
        rewardId,
        pointsCost,
        metadata: input.metadata ?? null,
      },
      {
        brandId: customer.brandId ?? undefined,
        actorUserId: context.actorUserId,
        source: "loyalty",
      },
    );

    await this.resolveTierForCustomer(customer.id, context);

    return {
      customerId: customer.id,
      pointsBalance: updated.pointsBalance,
      tierId: updated.tierId ?? undefined,
    };
  }

  async resolveTierForCustomer(customerId: string, context: LoyaltyActionContext = {}) {
    const customer = await this.db.loyaltyCustomer.findUnique({
      where: { id: customerId },
      include: {
        program: {
          select: {
            id: true,
            brandId: true,
            tiers: {
              select: {
                id: true,
                name: true,
                minPoints: true,
                maxPoints: true,
              },
              orderBy: { minPoints: "asc" },
            },
          },
        },
      },
    });
    if (!customer) throw notFound("Loyalty customer not found");
    this.assertBrandAccess(customer.brandId, context.brandId);
    const tiers = customer.program?.tiers ?? [];
    const eligible = tiers
      .filter((tier) => {
        const hasMin = customer.pointsBalance >= tier.minPoints;
        const withinMax = tier.maxPoints == null || customer.pointsBalance <= tier.maxPoints;
        return hasMin && withinMax;
      })
      .sort((a, b) => b.minPoints - a.minPoints);

    const targetTier = eligible[0];
    const newTierId = targetTier?.id ?? null;
    const newTierName = targetTier?.name ?? null;

    if (newTierId === customer.tierId) {
      return;
    }

    await this.db.loyaltyCustomer.update({
      where: { id: customerId },
      data: {
        tierId: newTierId,
        tier: newTierName ?? null,
      },
    });

    await emitLoyaltyTierChanged(
      {
        brandId: customer.brandId ?? undefined,
        customerId,
        oldTierId: customer.tierId ?? undefined,
        newTierId: newTierId ?? undefined,
        tierName: newTierName ?? undefined,
      },
      {
        brandId: customer.brandId ?? undefined,
        actorUserId: context.actorUserId,
        source: "loyalty",
      },
    );
  }

  private async ensureProgram(programId: string, context: LoyaltyActionContext) {
    const program = await this.db.loyaltyProgram.findUnique({
      where: { id: programId },
      select: programSelect,
    });
    if (!program) throw notFound("Loyalty program not found");
    this.assertBrandAccess(program.brandId, context.brandId);
    return program;
  }

  private assertBrandAccess(entityBrand?: string | null, contextBrand?: string) {
    if (contextBrand && entityBrand && contextBrand !== entityBrand) {
      throw forbidden("Access denied for this brand");
    }
  }

  private async applyPointsDelta(
    customer: { id: string; brandId?: string | null; programId: string },
    delta: number,
    reason: string,
    callback?: (
      tx: Prisma.TransactionClient,
      updated: Prisma.LoyaltyCustomerGetPayload<{ select: typeof customerSelect }>,
    ) => Promise<void>,
  ) {
    const updated = await this.db.$transaction(async (tx) => {
      const updatedCustomer = await tx.loyaltyCustomer.update({
        where: { id: customer.id },
        data: { pointsBalance: { increment: delta } },
        select: customerSelect,
      });
      await tx.loyaltyTransaction.create({
        data: {
          brandId: customer.brandId ?? null,
          customerId: customer.id,
          programId: customer.programId,
          pointsChange: delta,
          reason,
        },
      });
      if (callback) {
        await callback(tx, updatedCustomer);
      }
      return updatedCustomer;
    });
    return updated;
  }

}

export const loyaltyService = new LoyaltyService();
