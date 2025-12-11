import { prisma } from "../core/prisma.js";
import { planDefinitions } from "../core/plans.js";
import type { Prisma } from "@prisma/client";

export async function seedPlans() {
  const plans = Object.values(planDefinitions) as Array<{
    key: string;
    name: string;
    description?: string | null;
    features?: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput;
  }>;

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { key: plan.key },
      update: {
        name: plan.name,
        description: plan.description,
        featuresJson: plan.features,
      },
      create: {
        key: plan.key,
        name: plan.name,
        description: plan.description,
        featuresJson: plan.features,
      },
    });
  }
}

if (process.argv[1]?.includes("plans.seed")) {
  seedPlans()
    .then(async () => {
      console.log("✅ Plan catalog seed completed");
      await prisma.$disconnect();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error("❌ Plan catalog seed failed", err);
      await prisma.$disconnect();
      process.exit(1);
    });
}
