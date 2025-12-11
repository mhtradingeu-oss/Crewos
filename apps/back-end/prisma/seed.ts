import { prisma } from "../src/core/prisma.js";
import { seedSuperAdmin } from "../src/seeds/admin.seed.js";

async function run() {
  await seedSuperAdmin();
}

run()
  .then(async () => {
    await prisma.$disconnect();
    console.log("✅ Prisma seed completed");
  })
  .catch(async (err) => {
    console.error("❌ Prisma seed failed", err);
    await prisma.$disconnect();
    process.exit(1);
  });
