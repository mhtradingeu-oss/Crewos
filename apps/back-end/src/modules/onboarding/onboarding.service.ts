import { badRequest, unauthorized } from "../../core/http/errors.js";
import { prisma } from "../../core/prisma.js";
import { getPlanDefinition, planDefinitions, type PlanKey, type PlanFeatureSet } from "../../core/plans.js";
import type { Prisma } from "@prisma/client";

export const PERSONAS = [
  "RETAILER_DEALER",
  "PRODUCT_BRAND_OWNER",
  "CREATOR_INFLUENCER",
  "MEDIA_PLATFORM",
  "SERVICE_PROVIDER",
  "MEMBERSHIP_PROGRAM",
  "AFFILIATE_MARKETER",
  "MARKETING_AGENCY",
  "SALES_REP_ORG",
  "WHITE_LABEL_BUILDER",
] as const;

export type Persona = (typeof PERSONAS)[number];
export type OnboardingProfile = Prisma.TenantOnboardingProfileGetPayload<{ include: { tenant: true } }>;

const DEFAULT_PERSONA: Persona = "RETAILER_DEALER";

async function getUserWithTenant(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      tenantId: true,
      tenant: { select: { id: true, planId: true, plan: { select: { id: true, key: true } } } },
    },
  });
}

async function ensureProfile(userId: string): Promise<OnboardingProfile> {
  const user = await getUserWithTenant(userId);
  if (!user?.tenantId || !user.tenant) {
    throw unauthorized("User is not associated with a tenant");
  }

  // Reuse the most recent onboarding profile (completed or in-progress) to avoid
  // forcing users back into onboarding once they've finished.
  const existing = await prisma.tenantOnboardingProfile.findFirst({
    where: { tenantId: user.tenantId, userId },
    orderBy: { createdAt: "desc" },
    include: { tenant: true },
  });
  if (existing) return existing;

  const selectedPlanKey: PlanKey = (user.tenant.plan?.key as PlanKey) ?? "free";
  return prisma.tenantOnboardingProfile.create({
    data: {
      tenantId: user.tenantId,
      userId,
      persona: DEFAULT_PERSONA,
      selectedPlanKey,
      status: "in_progress",
    },
    include: { tenant: true },
  });
}

export async function startOnboarding(userId: string) {
  return ensureProfile(userId);
}

export async function updatePersona(userId: string, persona: Persona) {
  if (!PERSONAS.includes(persona)) {
    throw badRequest("Invalid persona");
  }
  const profile = await ensureProfile(userId);
  return prisma.tenantOnboardingProfile.update({
    where: { id: profile.id },
    data: { persona, status: "in_progress" },
    include: { tenant: true },
  });
}

export type PlanSelectionInput = {
  planKey: PlanKey;
  selectedModules?: Partial<PlanFeatureSet>;
};

export async function selectPlan(userId: string, input: PlanSelectionInput) {
  const profile = await ensureProfile(userId);
  const tenant = profile.tenant;
  const targetPlanDef = getPlanDefinition(input.planKey);
  const targetPlan = await prisma.plan.findUnique({ where: { key: targetPlanDef.key }, select: { id: true, key: true } });
  if (!targetPlan) {
    throw badRequest("Plan not found");
  }

  const currentPlanId = tenant.planId ?? undefined;
  const overridesJson = input.selectedModules
    ? (input.selectedModules as Prisma.InputJsonValue)
    : undefined;

  await prisma.$transaction(async (tx) => {
    await tx.tenant.update({
      where: { id: tenant.id },
      data: {
        planId: targetPlan.id,
        planOverridesJson: overridesJson,
      },
    });

    await tx.tenantPlanChange.create({
      data: {
        tenantId: tenant.id,
        fromPlanId: currentPlanId,
        toPlanId: targetPlan.id,
        changedByUserId: userId,
        metadataJson: overridesJson,
      },
    });

    await tx.tenantOnboardingProfile.update({
      where: { id: profile.id },
      data: {
        selectedPlanKey: targetPlan.key,
        selectedModulesJson: overridesJson,
        status: "completed",
        completedAt: new Date(),
      },
    });
  });

  return {
    plan: targetPlan.key,
    overrides: input.selectedModules ?? null,
  };
}

export function getOnboardingOptions() {
  return {
    personas: PERSONAS,
    plans: Object.values(planDefinitions).map((plan: any) => ({
      key: plan.key,
      name: plan.name,
      description: plan.description,
      features: plan.features,
    })),
  };
}

export const onboardingService = {
  startOnboarding,
  updatePersona,
  selectPlan,
  getOnboardingOptions,
};
