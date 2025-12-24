// PlatformOpsRepository: Move all prisma queries from platform-ops.service.ts here
import { prisma } from '../../prisma.js';

  async healthCheck() {
    await prisma.$queryRaw`SELECT 1`;
  },

  async listJobs(where) {
    return prisma.scheduledJob.findMany({
      where,
      orderBy: { lastRunAt: "desc" },
      take: 10,
    });
  },

  async listUsers() {
    return prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
      take: 50,
    });
  },

  async listTenants() {
    return prisma.tenant.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        plan: { select: { key: true } },
        brands: { select: { id: true, name: true, slug: true } },
        _count: { select: { users: true, brands: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async listBrandMetrics(brandIds) {
    return prisma.brand.findMany({
      where: { id: { in: brandIds } },
      select: {
        id: true,
        name: true,
        slug: true,
        _count: { select: { users: true, products: true, revenueRecords: true } },
      },
    });
  },

  async groupRevenueByBrand(brandIds) {
    return prisma.revenueRecord.groupBy({
      by: ["brandId"],
      where: { brandId: { in: brandIds } },
      _sum: { amount: true },
    });
  },

  async listUsersWithRBAC(where, skip, take) {
    const [total, users] = await prisma.$transaction([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          rolesJson: true,
          tenantId: true,
          brandId: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
    ]);
    return { total, users };
  },

  async findUserById(userId) {
    return prisma.user.findUnique({ where: { id: userId }, select: {
      id: true,
      email: true,
      role: true,
      status: true,
      rolesJson: true,
      tenantId: true,
      brandId: true,
      createdAt: true,
      updatedAt: true,
    }});
  },

  async updateUserRole(userId, role, rolesJson) {
    return prisma.user.update({
      where: { id: userId },
      data: { role, rolesJson },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        rolesJson: true,
        tenantId: true,
        brandId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  },

  async findRoleById(roleId) {
    return prisma.role.findUnique({ where: { id: roleId } });
  },

  async findRoleByName(roleName) {
    return prisma.role.findUnique({ where: { name: roleName } });
  },

  async countSuperAdmins(excludeUserId) {
    return prisma.user.count({
      where: { role: "SUPER_ADMIN", id: { not: excludeUserId } },
    });
  },
};
