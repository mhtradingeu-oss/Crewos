/**
 * FINANCE SERVICE — MH-OS v2
 * Spec: docs/os/21_finance-os.md (MASTER_INDEX)
 */
import type { Prisma } from "@prisma/client";
import { prisma } from "../../core/prisma.js";
import { buildPagination } from "../../core/utils/pagination.js";
import { badRequest, notFound } from "../../core/http/errors.js";
import {
  emitFinanceCreated,
  emitFinanceDeleted,
  emitFinanceExpenseCreated,
  emitFinanceInvoiceCreated,
  emitFinanceInvoiceStatusChanged,
  emitFinanceUpdated,
} from "./finance.events.js";
import type {
  CreateFinanceInput,
  CreateFinanceExpenseInput,
  CreateFinanceInvoiceInput,
  FinanceExpenseDTO,
  FinanceInvoiceDTO,
  FinanceRecord,
  FinanceSnapshot,
  UpdateFinanceInput,
  UpdateFinanceInvoiceStatusInput,
} from "./finance.types.js";

const revenueSelect = {
  id: true,
  brandId: true,
  productId: true,
  channel: true,
  amount: true,
  currency: true,
  periodStart: true,
  periodEnd: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.RevenueRecordSelect;

const expenseSelect = {
  id: true,
  brandId: true,
  category: true,
  amount: true,
  currency: true,
  incurredAt: true,
  description: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.FinanceExpenseSelect;

const invoiceSelect = {
  id: true,
  brandId: true,
  customerId: true,
  externalId: true,
  amount: true,
  currency: true,
  status: true,
  issuedAt: true,
  dueAt: true,
  paidAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.FinanceInvoiceSelect;

function mapExpense(record: Prisma.FinanceExpenseGetPayload<{ select: typeof expenseSelect }>): FinanceExpenseDTO {
  return {
    id: record.id,
    brandId: record.brandId,
    category: record.category,
    amount: Number(record.amount),
    currency: record.currency,
    incurredAt: record.incurredAt.toISOString(),
    description: record.description ?? undefined,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function mapInvoice(record: Prisma.FinanceInvoiceGetPayload<{ select: typeof invoiceSelect }>): FinanceInvoiceDTO {
  return {
    id: record.id,
    brandId: record.brandId,
    customerId: record.customerId ?? undefined,
    externalId: record.externalId ?? undefined,
    amount: Number(record.amount),
    currency: record.currency,
    status: record.status ?? "draft",
    issuedAt: record.issuedAt ? record.issuedAt.toISOString() : undefined,
    dueAt: record.dueAt ? record.dueAt.toISOString() : undefined,
    paidAt: record.paidAt ? record.paidAt.toISOString() : undefined,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

class FinanceService {
  constructor(private readonly db = prisma) {}

  async list(
    params: { brandId?: string; productId?: string; page?: number; pageSize?: number } = {},
  ) {
    const { brandId, productId, page = 1, pageSize = 20 } = params;
    const { skip, take } = buildPagination({ page, pageSize });
    const where: Prisma.RevenueRecordWhereInput = {};
    if (brandId) where.brandId = brandId;
    if (productId) where.productId = productId;

        const [total, rows] = await this.db.$transaction([
      this.db.revenueRecord.count({ where }),
      this.db.revenueRecord.findMany({
        where,
        select: revenueSelect,
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
    ]);

        return {
          items: rows.map((row) => this.map(row)),
          total,
          page,
          pageSize: take,
        };
  }

  async getById(id: string): Promise<FinanceRecord> {
    const record = await this.db.revenueRecord.findUnique({ where: { id }, select: revenueSelect });
    if (!record) throw notFound("Finance record not found");
    return this.map(record);
  }

  async create(input: CreateFinanceInput): Promise<FinanceRecord> {
    if (input.amount === undefined || input.amount === null) {
      throw badRequest("amount is required");
    }
    const created = await this.db.revenueRecord.create({
      data: {
        brandId: input.brandId ?? null,
        productId: input.productId ?? null,
        channel: input.channel ?? null,
        amount: input.amount,
        currency: input.currency ?? "EUR",
        periodStart: input.periodStart ? new Date(input.periodStart) : null,
        periodEnd: input.periodEnd ? new Date(input.periodEnd) : null,
      },
      select: revenueSelect,
    });
    await emitFinanceCreated(
      { id: created.id, brandId: created.brandId ?? undefined },
      { brandId: created.brandId ?? undefined, source: "api" },
    );
    return this.map(created);
  }

  async update(id: string, input: UpdateFinanceInput): Promise<FinanceRecord> {
    const existing = await this.db.revenueRecord.findUnique({
      where: { id },
      select: revenueSelect,
    });
    if (!existing) throw notFound("Finance record not found");

    const updated = await this.db.revenueRecord.update({
      where: { id },
      data: {
        brandId: input.brandId ?? existing.brandId,
        productId: input.productId ?? existing.productId,
        channel: input.channel ?? existing.channel,
        amount: input.amount ?? existing.amount,
        currency: input.currency ?? existing.currency,
        periodStart: input.periodStart ? new Date(input.periodStart) : existing.periodStart,
        periodEnd: input.periodEnd ? new Date(input.periodEnd) : existing.periodEnd,
      },
      select: revenueSelect,
    });
    await emitFinanceUpdated(
      { id: updated.id, brandId: updated.brandId ?? undefined },
      { brandId: updated.brandId ?? undefined, source: "api" },
    );
    return this.map(updated);
  }

  async remove(id: string) {
    const record = await this.db.revenueRecord.findUnique({
      where: { id },
      select: { id: true, brandId: true },
    });
    if (!record) throw notFound("Finance record not found");
    await this.db.revenueRecord.delete({ where: { id } });
    await emitFinanceDeleted(
      { id, brandId: record.brandId ?? undefined },
      { brandId: record.brandId ?? undefined, source: "api" },
    );
    return { id };
  }

  async listExpenses(params: {
    brandId: string;
    category?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    pageSize?: number;
  }) {
    const { brandId, category, startDate, endDate, page = 1, pageSize = 20 } = params;
    const { skip, take } = buildPagination({ page, pageSize });
    const where: Prisma.FinanceExpenseWhereInput = { brandId };
    if (category) where.category = category;
    if (startDate || endDate) {
      where.incurredAt = {};
      if (startDate) where.incurredAt.gte = new Date(startDate);
      if (endDate) where.incurredAt.lte = new Date(endDate);
    }

        const [total, rows] = await this.db.$transaction([
      this.db.financeExpense.count({ where }),
      this.db.financeExpense.findMany({
        where,
        select: expenseSelect,
        orderBy: { incurredAt: "desc" },
        skip,
        take,
      }),
    ]);

        return {
          items: rows.map((row) => mapExpense(row)),
          total,
          page,
          pageSize: take,
        };
  }

  async createExpense(input: CreateFinanceExpenseInput): Promise<FinanceExpenseDTO> {
    const created = await this.db.financeExpense.create({
      data: {
        brandId: input.brandId,
        category: input.category,
        amount: input.amount,
        currency: input.currency,
        incurredAt: new Date(input.incurredAt),
        description: input.description ?? null,
      },
      select: expenseSelect,
    });

    await emitFinanceExpenseCreated(
      {
        expenseId: created.id,
        brandId: created.brandId,
        category: created.category,
        amount: Number(created.amount),
        currency: created.currency,
        incurredAt: created.incurredAt.toISOString(),
      },
      { brandId: created.brandId, source: "api" },
    );

    return mapExpense(created);
  }

  async listInvoices(params: {
    brandId: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }) {
    const { brandId, status, page = 1, pageSize = 20 } = params;
    const { skip, take } = buildPagination({ page, pageSize });
    const where: Prisma.FinanceInvoiceWhereInput = { brandId };
    if (status) where.status = status;

        const [total, rows] = await this.db.$transaction([
      this.db.financeInvoice.count({ where }),
      this.db.financeInvoice.findMany({
        where,
        select: invoiceSelect,
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
    ]);

        return {
          items: rows.map((row) => mapInvoice(row)),
          total,
          page,
          pageSize: take,
        };
  }

  async createInvoice(input: CreateFinanceInvoiceInput): Promise<FinanceInvoiceDTO> {
    const created = await this.db.financeInvoice.create({
      data: {
        brandId: input.brandId,
        customerId: input.customerId ?? null,
        externalId: input.externalId ?? null,
        amount: input.amount,
        currency: input.currency,
        status: input.status ?? "draft",
        issuedAt: input.issuedAt ? new Date(input.issuedAt) : null,
        dueAt: input.dueAt ? new Date(input.dueAt) : null,
        paidAt: input.paidAt ? new Date(input.paidAt) : null,
      },
      select: invoiceSelect,
    });

    await emitFinanceInvoiceCreated(
      {
        invoiceId: created.id,
        brandId: created.brandId,
        amount: Number(created.amount),
        currency: created.currency,
        status: created.status ?? "draft",
      },
      { brandId: created.brandId, source: "api" },
    );

    return mapInvoice(created);
  }

  async updateInvoiceStatus(
    invoiceId: string,
    input: UpdateFinanceInvoiceStatusInput,
  ): Promise<FinanceInvoiceDTO> {
    const existing = await this.db.financeInvoice.findUnique({
      where: { id: invoiceId },
      select: invoiceSelect,
    });
    if (!existing) throw notFound("Invoice not found");

    const updated = await this.db.financeInvoice.update({
      where: { id: invoiceId },
      data: {
        status: input.status,
        paidAt: input.paidAt ? new Date(input.paidAt) : existing.paidAt,
      },
      select: invoiceSelect,
    });

    await emitFinanceInvoiceStatusChanged(
      {
        invoiceId: updated.id,
        brandId: updated.brandId,
        oldStatus: existing.status ?? "draft",
        newStatus: updated.status ?? "draft",
        amount: Number(updated.amount),
        currency: updated.currency,
      },
      { brandId: updated.brandId, source: "api" },
    );

    return mapInvoice(updated);
  }

  async buildFinancialSnapshot(brandId: string): Promise<FinanceSnapshot> {
    const [revenueAgg, expenseAgg, invoiceAgg] = await this.db.$transaction([
      this.db.revenueRecord.aggregate({
        where: { brandId },
        _sum: { amount: true },
      }),
      this.db.financeExpense.aggregate({
        where: { brandId },
        _sum: { amount: true },
      }),
      this.db.financeInvoice.aggregate({
        where: { brandId, status: { not: "paid" } },
        _sum: { amount: true },
      }),
    ]);

    const revenue = Number(revenueAgg._sum.amount ?? 0);
    const expenses = Number(expenseAgg._sum.amount ?? 0);
    const outstandingInvoices = Number(invoiceAgg._sum.amount ?? 0);

    return {
      revenue,
      expenses,
      net: revenue - expenses,
      outstandingInvoices,
    };
  }

  async ensureInvoiceBelongsToBrand(invoiceId: string, brandId: string) {
    const record = await this.db.financeInvoice.findUnique({
      where: { id: invoiceId },
      select: invoiceSelect,
    });
    if (!record) {
      throw notFound("Invoice not found");
    }
    if (record.brandId !== brandId) {
      throw badRequest("Invoice does not belong to the requested brand");
    }
    return mapInvoice(record);
  }

  private map(
    row: Prisma.RevenueRecordGetPayload<{ select: typeof revenueSelect }>,
  ): FinanceRecord {
    return {
      id: row.id,
      brandId: row.brandId ?? undefined,
      productId: row.productId ?? undefined,
      channel: row.channel ?? undefined,
      amount: row.amount ? Number(row.amount) : null,
      currency: row.currency ?? undefined,
      periodStart: row.periodStart ? row.periodStart.toISOString() : undefined,
      periodEnd: row.periodEnd ? row.periodEnd.toISOString() : undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}

export const financeService = new FinanceService();
