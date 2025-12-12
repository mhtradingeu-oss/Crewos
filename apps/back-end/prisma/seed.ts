import { seedSuperAdmin } from "../src/seeds/admin.seed.js";
import { prisma } from "../src/core/prisma.js";

async function main() {
  console.log("🚀 Running Prisma DB seed...");
  await seedSuperAdmin();
}

main()
  .catch(async (e) => {
    console.error("❌ Prisma seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log("🌱 Prisma seed completed.");
  });
