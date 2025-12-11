import type { Prisma } from "@prisma/client";
import { prisma } from "../../core/prisma.js";
import type { AIMessage } from "../../core/ai-service/ai-client.js";
import { runAIRequest } from "../../core/ai-service/ai-client.js";
import { notFound } from "../../core/http/errors.js";
import { logger } from "../../core/logger.js";
import { emitKnowledgeBaseSummarized } from "./knowledge-base.events.js";
import type { KnowledgeSummaryDTO } from "./knowledge-base.types.js";

const insightSelect = {
  id: true,
  summary: true,
  details: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.AIInsightSelect;

export async function generateKnowledgeSummary({
  brandId,
  documentId,
}: {
  brandId: string;
  documentId: string;
}): Promise<KnowledgeSummaryDTO> {
  const document = await prisma.knowledgeDocument.findFirst({
    where: { id: documentId, brandId },
    include: {
      category: { select: { name: true } },
      tags: { select: { name: true }, orderBy: { createdAt: "asc" } },
      brand: { select: { name: true, slug: true } },
      product: { select: { id: true, name: true, brandId: true } },
      campaign: { select: { id: true, name: true, brandId: true } },
    },
  });
  if (!document) {
    throw notFound("Knowledge document not found");
  }

  const brandName = document.brand?.name ?? "Brand";
  const docSummaryLines = [
    `Title: ${document.title}`,
    `Category: ${document.category?.name ?? "N/A"}`,
    `Tags: ${document.tags.map((tag) => tag.name).join(", ") || "N/A"}`,
    `Source: ${document.sourceType ?? "unspecified"}`,
    `Language: ${document.language ?? "unspecified"}`,
    `Content:\n${document.content ?? "No content available."}`,
  ];

  const messages: AIMessage[] = [
    {
      role: "system",
      content: "You are MH-OS's Knowledge Base Analyst. Extract actionable insights from each document.",
    },
    {
      role: "user",
      content: `Brand: ${brandName}\nDocument ID: ${documentId}\n${docSummaryLines.join("\n")}\n\nSummarize the most important ideas, suggest any follow-up actions, and highlight data that may be outdated.`,
    },
  ];

  const response = await runAIRequest({
    model: process.env.AI_MODEL_MHOS ?? "gpt-4-turbo",
    messages,
  });

  const details = response.content?.trim() ?? "AI summary could not be generated.";
  const summary = details.split("\n")[0] ?? "AI summary generated";

  const [insight] = await prisma.$transaction([
    prisma.aIInsight.create({
      data: {
        brandId,
        os: "knowledge-base",
        entityType: "document",
        entityId: documentId,
        summary,
        details,
      },
      select: insightSelect,
    }),
    prisma.aILearningJournal.create({
      data: {
        brandId,
        source: "knowledge-base-summary",
        eventType: "summary",
        inputSnapshotJson: JSON.stringify({
          documentId,
          title: document.title,
          tags: document.tags.map((tag) => tag.name),
        }),
        outputSnapshotJson: JSON.stringify({ summary, details }),
      },
    }),
    prisma.knowledgeDocument.update({
      where: { id: documentId },
      data: { summary },
    }),
  ]);

  await emitKnowledgeBaseSummarized({
    brandId,
    documentId,
    action: "summarized",
    metadata: {
      hasProductLink: Boolean(document.product),
      hasCampaignLink: Boolean(document.campaign),
      summaryLength: summary.length,
    },
  });

  logger.info(`[knowledge-base] AI summary generated for document ${documentId}`);
  return {
    insightId: insight.id,
    summary,
    details,
  };
}
