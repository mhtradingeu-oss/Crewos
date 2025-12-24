// BrandRepository: Move all prisma queries from brand.service.ts here
import { prisma } from '../../prisma.js';

export const BrandRepository = {
  async listBrandsWithCount({ where, skip, take }) {
    const [total, items] = await prisma.$transaction([
      prisma.brand.count({ where }),
      prisma.brand.findMany({
        where,
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          countryOfOrigin: true,
          defaultCurrency: true,
          settingsJson: true,
          tenantId: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
    ]);
    return [total, items];
  },
  async createBrand(args) {
    return prisma.brand.create(args);
  },
  async updateBrand(args) {
    return prisma.brand.update(args);
  },
  async deleteBrand(args) {
    return prisma.brand.delete(args);
  },
  async findBrandIdentity(args) {
    return prisma.brandIdentity.findUnique(args);
  },
  async upsertBrandIdentity(args) {
    return prisma.brandIdentity.upsert(args);
  },
  async createAIInsight(args) {
    return prisma.aIInsight.create(args);
  },
  async findBrandRules(args) {
    return prisma.brandRules.findUnique(args);
  },
  async upsertBrandRules(args) {
    return prisma.brandRules.upsert(args);
  },
  async findBrandAIConfig(args) {
    return prisma.brandAIConfig.findUnique(args);
  },
  async upsertBrandAIConfig(args) {
    return prisma.brandAIConfig.upsert(args);
  },
  async findBrandBySlug(args) {
    return prisma.brand.findUnique(args);
  },
  async countBrands(args) {
    return prisma.brand.count(args);
  },
  async findUsers(args) {
    return prisma.user.findMany(args);
  },
  async findBrandById(args) {
    return prisma.brand.findUnique(args);
  },
};
