/**
 * SUPPORT SERVICE — MH-OS v2
 */
import type { Prisma } from "@prisma/client";
import * as supportRepository from "../../core/db/repositories/support.repository.js";
import { buildPagination } from "../../core/utils/pagination.js";
import { badRequest, notFound } from "../../core/http/errors.js";
import { logger } from "../../core/logger.js";
import { detectLanguage } from "../../core/ai/ai-utils.js";
import { runSupportRouter } from "../../core/ai/engines/support-router.engine.js";
import { runSupportEngine } from "../../core/ai/engines/support.engine.js";
import {
  startVoiceSession as aiStartVoiceSession,
  processVoiceInput,
  endVoiceSession,
  getVoiceSession as loadVoiceSession,
} from "../../core/ai/engines/voice.engine.js";
import type {
  AddTicketMessageInput,
  AssignTicketInput,
  ConversationDTO,
  ConversationListParams,
  ConversationSummaryDTO,
  CreateTicketInput,
  EndVoiceSessionInput,
  PaginatedTickets,
  StartVoiceSessionInput,
  TicketAssignmentDTO,
  TicketDTO,
  TicketListParams,
  TicketMessageDTO,
  TicketSummaryDTO,
  TicketTagDTO,
  UpdateTicketStatusInput,
  VoiceSessionDTO,
  VoiceTranscriptDTO,
  VoiceTurnDTO,
  VoiceTurnInput,
  ConversationsResponse,
} from "./support.types.js";

function parseJSON<T>(value?: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

const ticketListSelect = {
  id: true,
  brandId: true,
  contactId: true,
  createdByUserId: true,
  assignedToUserId: true,
  status: true,
  channel: true,
  locale: true,
  source: true,
  priority: true,
  category: true,
  metadataJson: true,
  closedAt: true,
  createdAt: true,
  updatedAt: true,
  messages: {
    take: 1,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      ticketId: true,
      senderId: true,
      content: true,
      createdAt: true,
      updatedAt: true,
    },
  },
  tags: {
    select: {
      id: true,
      name: true,
    },
  },
  assignments: {
    select: {
      id: true,
      userId: true,
      brandId: true,
      role: true,
    },
  },
} satisfies Prisma.TicketSelect;

const ticketDetailSelect: Prisma.TicketSelect = {
  ...ticketListSelect,
  messages: {
    select: {
      id: true,
      ticketId: true,
      senderId: true,
      content: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "asc" },
  },
};

type TicketListRecord = Prisma.TicketGetPayload<{ select: typeof ticketListSelect }>;
type TicketDetailRecord = Prisma.TicketGetPayload<{ select: typeof ticketDetailSelect }>;
const voiceTranscriptSelect = {
  id: true,
  sessionId: true,
  role: true,
  text: true,
  audioUrl: true,
  locale: true,
  actionJson: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.VoiceTranscriptSelect;

const voiceSessionListSelect = {
  id: true,
  brandId: true,
  tenantId: true,
  ticketId: true,
  channel: true,
  locale: true,
  status: true,
  startedAt: true,
  endedAt: true,
  updatedAt: true,
  summary: true,
  sentiment: true,
  tagsJson: true,
  transcripts: {
    take: 1,
    orderBy: { createdAt: "desc" },
    select: voiceTranscriptSelect,
  },
} satisfies Prisma.VoiceSessionSelect;

const voiceSessionDetailInclude = {
  transcripts: { orderBy: { createdAt: "asc" }, select: voiceTranscriptSelect },
} satisfies Prisma.VoiceSessionInclude;

type VoiceSessionListRecord = Prisma.VoiceSessionGetPayload<{ select: typeof voiceSessionListSelect }>;
type VoiceSessionRecord = Prisma.VoiceSessionGetPayload<{ include: typeof voiceSessionDetailInclude }>;
type VoiceTranscriptRecord = Prisma.VoiceTranscriptGetPayload<{ select: typeof voiceTranscriptSelect }>;

function toMessageDTO(record: TicketListRecord["messages"][number]): TicketMessageDTO {
  return {
    id: record.id,
    ticketId: record.ticketId,
    senderId: record.senderId ?? undefined,
    content: record.content ?? undefined,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function toTagDTO(record: TicketListRecord["tags"][number]): TicketTagDTO {
  return { id: record.id, name: record.name };
}

function toAssignmentDTO(record: TicketListRecord["assignments"][number]): TicketAssignmentDTO {
  return {
    id: record.id,
    userId: record.userId ?? undefined,
    brandId: record.brandId ?? undefined,
    role: record.role ?? undefined,
  };
}

function toTicketSummary(record: TicketListRecord): TicketSummaryDTO {
  const latestMessage = record.messages?.[0];
  return {
    id: record.id,
    brandId: record.brandId ?? null,
    contactId: record.contactId ?? null,
    createdByUserId: record.createdByUserId ?? null,
    assignedToUserId: record.assignedToUserId ?? null,
    status: record.status ?? null,
    channel: record.channel ?? null,
    locale: record.locale ?? null,
    source: record.source ?? null,
    priority: record.priority ?? null,
    category: record.category ?? null,
    metadata: parseJSON(record.metadataJson),
    metadataJson: record.metadataJson ?? null,
    closedAt: record.closedAt ?? null,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    latestMessage: latestMessage ? toMessageDTO(latestMessage) : undefined,
    tags: (record.tags ?? []).map(toTagDTO),
    assignments: (record.assignments ?? []).map(toAssignmentDTO),
  };
}

function toTicketDTO(record: TicketDetailRecord): TicketDTO {
  return {
    ...toTicketSummary(record as TicketListRecord),
    messages: (record.messages ?? []).map(toMessageDTO),
  };
}

function toVoiceTranscriptDTO(record: VoiceTranscriptRecord): VoiceTranscriptDTO {
  return {
    id: record.id,
    sessionId: record.sessionId,
    role: record.role ?? null,
    text: record.text ?? null,
    audioUrl: record.audioUrl ?? null,
    locale: record.locale ?? null,
    action: parseJSON<Record<string, unknown>>(record.actionJson) ?? null,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function toVoiceSessionDTO(record: VoiceSessionRecord | VoiceSessionListRecord): VoiceSessionDTO {
  const tags = parseJSON<string[]>(record.tagsJson) ?? [];
  return {
    id: record.id,
    brandId: record.brandId ?? null,
    tenantId: record.tenantId ?? null,
    ticketId: record.ticketId ?? null,
    channel: record.channel ?? null,
    locale: record.locale ?? null,
    status: record.status ?? null,
    startedAt: record.startedAt,
    endedAt: record.endedAt ?? null,
    updatedAt: record.updatedAt,
    summary: record.summary ?? null,
    sentiment: record.sentiment ?? null,
    tags,
    transcripts: (record.transcripts ?? []).map(toVoiceTranscriptDTO),
  };
}

function toConversationSummaryFromTicket(record: TicketListRecord): ConversationSummaryDTO {
  const summary = toTicketSummary(record);
  const lastActivityAt = summary.latestMessage?.createdAt ?? summary.updatedAt;
  return {
    id: summary.id,
    type: "ticket",
    lastActivityAt,
    ticket: summary,
  };
}

function toConversationSummaryFromVoiceSession(record: VoiceSessionListRecord): ConversationSummaryDTO {
  const session = toVoiceSessionDTO(record);
  const latestTranscript = record.transcripts?.[0];
  const lastActivityAt = latestTranscript?.createdAt ?? record.updatedAt ?? record.startedAt;
  return {
    id: session.id,
    type: "voice",
    lastActivityAt,
    voiceSession: session,
  };
}

export const supportService = {
  async listTickets(params: TicketListParams): Promise<PaginatedTickets> {
    if (!params.brandId) {
      throw badRequest("brandId is required");
    }

    const { page = 1, pageSize = 20, search, status, assigneeId, brandId, channel } = params;
    const { skip, take } = buildPagination({ page, pageSize });

    const where: Prisma.TicketWhereInput = { brandId };

    if (status) where.status = status;
    if (assigneeId) where.assignedToUserId = assigneeId;
    if (channel) where.channel = channel;
    if (search) {
      where.OR = [
        { category: { contains: search, mode: "insensitive" } },
        { priority: { contains: search, mode: "insensitive" } },
        { status: { contains: search, mode: "insensitive" } },
        { tags: { some: { name: { contains: search, mode: "insensitive" } } } },
        { messages: { some: { content: { contains: search, mode: "insensitive" } } } },
      ];
    }

    const [total, rows] = await prisma.$transaction([
        await supportRepository.countTickets(where),
        await supportRepository.findManyTickets({
          where,
          select: ticketListSelect,
          orderBy: { updatedAt: "desc" },
          skip,
          take,
        }),
      ];

    return {
      items: rows.map(toTicketSummary),
      total,
      page,
      pageSize: take,
    };
  },

  async getTicketWithMessages(id: string, brandId: string): Promise<TicketDTO | null> {
    const record = await prisma.ticket.findFirst({
      where: { id, brandId },
      select: ticketDetailSelect,
    });
      if (!record) return null;
      return toTicketDTO(record as TicketDetailRecord);
  },

  async createTicket(input: CreateTicketInput): Promise<TicketDTO> {
    const ticket = await prisma.ticket.create({
      data: {
        brandId: input.brandId,
        createdByUserId: input.createdByUserId,
        contactId: input.contactId ?? null,
        channel: input.channel ?? null,
        locale: input.locale ?? null,
        source: input.source ?? null,
        category: input.category ?? null,
        priority: input.priority ?? null,
        status: input.status ?? "OPEN",
        assignedToUserId: input.assignedToUserId ?? null,
        metadataJson: input.metadata ? JSON.stringify(input.metadata) : null,
      },
      select: ticketDetailSelect,
    });
      // ...existing code...

    try {
      const routing = await runSupportRouter({
        ticketId: ticket.id,
        brandId: input.brandId,
        message: input.content ?? "",
        locale: ticket.locale ?? undefined,
      });
      if (routing) {
        const metadata = parseJSON<Record<string, unknown>>(ticket.metadataJson) ?? {};
        await prisma.ticket.update({
          where: { id: ticket.id },
          data: {
            metadataJson: JSON.stringify({ ...metadata, routing }),
            category: ticket.category ?? routing.topic ?? null,
            priority: ticket.priority ?? routing.urgency ?? null,
          },
        });
          // ...existing code...
      }
    } catch (err) {
      logger.warn(`[support] routing classification failed for ${ticket.id}: ${String(err)}`);
    }

    if (input.content) {
      await prisma.ticketMessage.create({
        data: {
          ticketId: ticket.id,
          senderId: input.createdByUserId,
          content: input.content,
        },
      });
        // ...existing code...
      logger.info(`[support] Created ticket ${ticket.id} with initial message`);
      const createdTicket = await this.getTicketWithMessages(ticket.id, input.brandId);
      if (!createdTicket) {
        throw notFound("Created ticket could not be retrieved");
      }
      return createdTicket;
    }

    logger.info(`[support] Created ticket ${ticket.id} for brand ${input.brandId}`);
    return toTicketDTO(ticket as TicketDetailRecord);
  },

  async addMessage(input: AddTicketMessageInput): Promise<TicketMessageDTO> {
    const ticket = await prisma.ticket.findUnique({
      where: { id: input.ticketId },
      select: { id: true, brandId: true },
    });
    if (!ticket) throw notFound("Ticket not found");

    const message = await prisma.ticketMessage.create({
      data: {
        ticketId: input.ticketId,
        senderId: input.senderId,
        content: input.content,
      },
    });

    logger.info(`[support] Message added to ${input.ticketId} by ${input.senderId}`);
    return toMessageDTO(message as TicketListRecord["messages"][number]);
  },

  async updateTicketStatus(input: UpdateTicketStatusInput): Promise<TicketDTO> {
    const ticket = await prisma.ticket.findFirst({
      where: { id: input.ticketId, brandId: input.brandId },
      select: ticketDetailSelect,
    });
    if (!ticket) throw notFound("Ticket not found");

    const updated = await prisma.ticket.update({
      where: { id: input.ticketId },
      data: { status: input.status, closedAt: input.closedAt ?? null },
      select: ticketDetailSelect,
    });

    logger.info(`[support] Ticket ${input.ticketId} status updated to ${input.status}`);
    return toTicketDTO(updated as TicketDetailRecord);
  },

  async assignTicket(input: AssignTicketInput): Promise<TicketAssignmentDTO> {
    const ticket = await prisma.ticket.findFirst({
      where: { id: input.ticketId },
      select: { id: true, brandId: true },
    });
    if (!ticket) throw notFound("Ticket not found");

    const assignment = await prisma.ticketAssignment.create({
      data: {
        ticketId: input.ticketId,
        userId: input.assigneeUserId,
        brandId: input.brandAssignmentScope ?? ticket.brandId ?? null,
        role: input.role ?? null,
      },
      select: {
        id: true,
        ticketId: true,
        userId: true,
        brandId: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await prisma.ticket.update({
      where: { id: input.ticketId },
      data: { assignedToUserId: input.assigneeUserId },
    });

    logger.info(
      `[support] Ticket ${input.ticketId} assigned to ${input.assigneeUserId} scope ${input.brandAssignmentScope}`,
    );

    return toAssignmentDTO(assignment as TicketListRecord["assignments"][number]);
  },

  async getConversation(ticketId: string, brandId: string): Promise<TicketDTO | null> {
    const conversation = await this.getConversationById(ticketId, brandId);
    return conversation?.ticket ?? null;
  },

  async closeTicket(input: UpdateTicketStatusInput): Promise<TicketDTO> {
    return this.updateTicketStatus({ ...input, status: input.status ?? "CLOSED", closedAt: input.closedAt ?? new Date() });
  },

  async runSupportAI(params: {
    brandId: string;
    tenantId?: string;
    userId?: string;
    channel?: string;
    message: string;
    locale?: string;
    ticketId?: string;
  }) {
    const locale = params.locale ?? detectLanguage(params.message);
    return runSupportEngine({ ...params, locale });
  },

  async listTicketMessages(ticketId: string, brandId: string): Promise<TicketMessageDTO[]> {
    const ticket = await prisma.ticket.findFirst({ where: { id: ticketId, brandId }, select: { id: true } });
    if (!ticket) throw notFound("Ticket not found");

    const messages = await prisma.ticketMessage.findMany({
      where: { ticketId },
      orderBy: { createdAt: "asc" },
    });

    return messages.map((message) => toMessageDTO(message as TicketListRecord["messages"][number]));
  },

  async listConversations(params: ConversationListParams): Promise<ConversationsResponse> {
    if (!params.brandId) {
      throw badRequest("brandId is required");
    }

    const { page = 1, pageSize = 20 } = params;
    const { skip, take } = buildPagination({ page, pageSize });
    const fetchLimit = skip + take;

    const [ticketCount, voiceCount] = await prisma.$transaction([
      prisma.ticket.count({ where: { brandId: params.brandId } }),
      prisma.voiceSession.count({ where: { brandId: params.brandId } }),
    ]);

    const [tickets, voiceSessions] = await prisma.$transaction([
      prisma.ticket.findMany({
        where: { brandId: params.brandId },
        select: ticketListSelect,
        orderBy: { updatedAt: "desc" },
        take: fetchLimit,
      }),
      prisma.voiceSession.findMany({
        where: { brandId: params.brandId },
        select: voiceSessionListSelect,
        orderBy: { updatedAt: "desc" },
        take: fetchLimit,
      }),
    ]);

    const combined: ConversationSummaryDTO[] = [
      ...tickets.map(toConversationSummaryFromTicket),
      ...voiceSessions.map(toConversationSummaryFromVoiceSession),
    ].sort((a, b) => b.lastActivityAt.getTime() - a.lastActivityAt.getTime());

    const items = combined.slice(skip, skip + take);

    return {
      items,
      total: ticketCount + voiceCount,
      page,
      pageSize: take,
    };
  },

  async getConversationById(id: string, brandId: string): Promise<ConversationDTO | null> {
    const ticket = await prisma.ticket.findFirst({ where: { id, brandId }, select: ticketDetailSelect });
    if (ticket) {
      return { type: "ticket", ticket: toTicketDTO(ticket as TicketDetailRecord) };
    }

    const voiceSession = await prisma.voiceSession.findFirst({
      where: { id, brandId },
      include: voiceSessionDetailInclude,
    });
    if (voiceSession) {
      return { type: "voice", voiceSession: toVoiceSessionDTO(voiceSession as VoiceSessionRecord) };
    }

    return null;
  },

  async startVoiceSession(input: StartVoiceSessionInput): Promise<VoiceSessionDTO> {
    const session = await aiStartVoiceSession({
      brandId: input.brandId,
      tenantId: input.tenantId,
      ticketId: input.ticketId,
      channel: input.channel,
      locale: input.locale,
    });
    const hydrated = await this.getVoiceSession(session.id);
    if (!hydrated) throw notFound("Voice session not found after creation");
    return hydrated;
  },

  async processVoiceTurn(input: VoiceTurnInput): Promise<VoiceTurnDTO> {
    const turn = await processVoiceInput({
      sessionId: input.sessionId,
      audioUrl: input.audioUrl,
      audioBase64: input.audioBase64,
      locale: input.locale,
    });
    const session = await this.getVoiceSession(input.sessionId);
    if (!session) throw notFound("Voice session not found");
    return { ...turn, session };
  },

  async completeVoiceSession(input: EndVoiceSessionInput) {
    const summary = await endVoiceSession({ sessionId: input.sessionId, locale: input.locale });
    const session = await this.getVoiceSession(input.sessionId);
    if (!session) throw notFound("Voice session not found");
    return { ...summary, session };
  },

  async getVoiceSession(sessionId: string): Promise<VoiceSessionDTO | null> {
    const session = await loadVoiceSession(sessionId);
    if (!session) return null;
    return toVoiceSessionDTO(session as VoiceSessionRecord);
  },
};
