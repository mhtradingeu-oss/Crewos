import { PrismaClient as PrismaClientType, PrismaClient } from "@prisma/client";

declare global {
  var prisma: PrismaClientType | undefined;
}

// Prisma Client configuration
const prismaClientOptions: ConstructorParameters<typeof PrismaClient>[0] = {
  log: ["query", "info", "warn", "error"],
};

export const prisma =
  global.prisma ??
  new PrismaClient(prismaClientOptions);

// Prevent multiple instances in dev
if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}
