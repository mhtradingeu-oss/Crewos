// PlanHistoryRepository: Move all prisma queries from plan-history.service.ts here
import { prisma } from '../../prisma.js';

  async listPlanHistory(userId: string, unauthorized: () => Error) {
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
  },
};
