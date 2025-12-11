import { unauthorized } from "../../core/http/errors.js";
import { prisma } from "../../core/prisma.js";

export async function listPlanHistory(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { tenantId: true } });
  if (!user?.tenantId) {
    throw unauthorized();
  }
  return prisma.tenantPlanChange.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      tenantId: true,
      fromPlanId: true,
      toPlanId: true,
      changedByUserId: true,
      metadataJson: true,
      createdAt: true,
      fromPlan: { select: { key: true, name: true } },
      toPlan: { select: { key: true, name: true } },
    },
  });
}

export const planHistoryService = { listPlanHistory };
