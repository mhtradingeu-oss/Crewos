import { PrismaClient as PrismaClientType, PrismaClient } from "@prisma/client";
import { logger } from "./logger.js";

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

if (process.env.NODE_ENV !== "test") {
  prisma.$use(async (params, next) => {
    const start = Date.now();
    try {
      const result = await next(params);
      const duration = Date.now() - start;
      if (duration >= 25) {
        logger.debug(`[db] ${params.model ?? "raw"}.${params.action} (${duration}ms)`);
      }
      return result;
    } catch (error) {
      logger.warn(`[db] ${params.model ?? "raw"}.${params.action} failed`, { error });
      throw error;
    }
  });
}

// Prevent multiple instances in dev
if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}
