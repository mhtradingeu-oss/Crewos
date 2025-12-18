import { Prisma } from "@prisma/client";
import type { AutomationExplainSnapshot } from "@mh-os/shared";
import { prisma } from "../../prisma.js";

export async function persistExplainSnapshot(
  snapshot: AutomationExplainSnapshot
): Promise<void> {
  try {
    await prisma.automationExplainSnapshot.create({
      data: {
        runId: snapshot.runId,
        ruleVersionId: snapshot.ruleVersionId,
        companyId: snapshot.companyId,
        brandId: snapshot.brandId ?? undefined,
        snapshotJson: snapshot as unknown as Prisma.InputJsonValue,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002" &&
      Array.isArray(error.meta?.target) &&
      error.meta.target.includes("runId")
    ) {
      return;
    }
    throw error;
  }
}
