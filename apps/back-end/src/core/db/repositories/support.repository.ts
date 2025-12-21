import { Prisma } from "@prisma/client";
import { prisma } from "../../prisma.js";

export async function findRecentTickets(brandId: string, limit = 5) {
  return prisma.ticket.findMany({
    where: { brandId },
    orderBy: { updatedAt: "desc" },
    take: limit,
    include: {
      messages: { orderBy: { createdAt: "desc" }, take: 3 },
      tags: true,
    },
  });
}

export async function findTicketWithMessages(ticketId: string, options?: { order?: Prisma.SortOrder; take?: number }) {
  return prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      messages: Object.assign(
        {
          orderBy: { createdAt: options?.order ?? "asc" },
        },
        options?.take ? { take: options.take } : {},
      ),
      tags: true,
    },
  });
}
