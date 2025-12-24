import { prisma } from "../../core/prisma.js";

export async function getDocumentById({ brandId, documentId }) {
	return prisma.knowledgeDocument.findFirst({
		where: { id: documentId, brandId },
		include: {
			category: { select: { name: true } },
			tags: { select: { name: true }, orderBy: { createdAt: "asc" } },
			brand: { select: { name: true, slug: true } },
			product: { select: { id: true, name: true, brandId: true } },
			campaign: { select: { id: true, name: true, brandId: true } },
		},
	});
}

export async function createAIInsightWithJournalAndSummary({ brandId, documentId, document, summary, details, insightSelect }) {
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
	return insight;
}

export async function searchDocumentsForAI(/* params */) {
	// Implement search logic as needed for AI
}

export async function listDocumentsForContext(/* params */) {
	// Implement listing logic as needed for AI
}
Refactor: Move all prisma queries from knowledge-base.ai.ts to repository. Add required methods for AI module delegation.