import { Prisma } from "@prisma/client";
import { prisma } from "../../prisma.js";

export async function findAutomationRuleVersions<
  T extends Prisma.AutomationRuleVersionFindManyArgs,
>(args: Prisma.SelectSubset<T, Prisma.AutomationRuleVersionFindManyArgs>) {
  return prisma.automationRuleVersion.findMany(args);
}

export type JsonValue = Prisma.JsonValue;
