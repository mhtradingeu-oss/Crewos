import { prisma } from "../../prisma.js";

import type { AIBannedAction, AISafetyConstraint, AIPromptFirewallRule } from "@prisma/client";

export async function findActiveFirewallRules(): Promise<Array<AIPromptFirewallRule>> {
  return prisma.aIPromptFirewallRule.findMany({ where: { active: true } });
}

export async function findActiveSafetyConstraints(): Promise<Array<AISafetyConstraint>> {
  return prisma.aISafetyConstraint.findMany({ where: { active: true } });
}

export async function findBannedActions(): Promise<Array<AIBannedAction>> {
  return prisma.aIBannedAction.findMany();
}
