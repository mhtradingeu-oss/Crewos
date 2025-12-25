import { Prisma } from "@prisma/client";
import { prisma } from "../../prisma.js";

type SuggestionFilter = Record<string, string | number | boolean | undefined>;

export class AISuggestionRepository {
  async listSuggestions(options: { filter?: SuggestionFilter } = {}) {
    const { filter = {} } = options;
    const where: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(filter)) {
      if (value === undefined || value === null) continue;
      where[key] = value;
    }

    return prisma.aISuggestion.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
  }

  async updateSuggestion(id: string, data: Prisma.AISuggestionUpdateInput) {
    return prisma.aISuggestion.update({
      where: { id },
      data,
    });
  }
}
