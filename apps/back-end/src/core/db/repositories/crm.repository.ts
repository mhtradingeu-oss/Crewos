// CrmRepository: Move all prisma queries from crm.service.ts here
import { prisma } from '../../prisma.js';

export const CrmRepository = {
  async listLeads({ where, skip, take, select }) {
    const [total, rows] = await prisma.$transaction([
      prisma.lead.count({ where }),
      prisma.lead.findMany({ where, select, orderBy: { createdAt: "desc" }, skip, take }),
    ]);
    return { total, rows };
  },
  async findLeadById(id, select) {
    return prisma.lead.findUnique({ where: { id }, select });
  },
  async findLeadForScore(id) {
    return prisma.lead.findUnique({
      where: { id },
      select: { brandId: true, person: { select: { firstName: true, lastName: true } } },
    });
  },
  async createLead({ data, select }) {
    return prisma.lead.create({ data, select });
  },
  async updateLead({ id, data, select }) {
    return prisma.lead.update({ where: { id }, data, select });
  },
  async findLeadIdBrand(id) {
    return prisma.lead.findUnique({ where: { id }, select: { id: true, brandId: true } });
  },
  async deleteLead(id) {
    return prisma.lead.delete({ where: { id } });
  },
  async findLeadContact(id) {
    return prisma.lead.findUnique({ where: { id }, select: { id: true, brandId: true, ownerId: true } });
  },
  async findLeadForCustomer(id) {
    return prisma.lead.findUnique({ where: { id }, select: { id: true, brandId: true, personId: true, companyId: true, ownerId: true } });
  },
  async findOrderAndRevenue(orderId, revenueRecordId) {
    const [order, revenueRecord] = await Promise.all([
      orderId ? prisma.salesOrder.findUnique({ where: { id: orderId }, select: { id: true, brandId: true } }) : null,
      revenueRecordId ? prisma.revenueRecord.findUnique({ where: { id: revenueRecordId }, select: { id: true, brandId: true } }) : null,
    ]);
    return [order, revenueRecord];
  },
  async crmCustomerExists(leadId) {
    return prisma.crmCustomer.findFirst({ where: { leadId } });
  },
  async convertLeadToCustomer({ lead, order, revenueRecord, resolvedBrandId, input, leadSelect, crmCustomerSelect }) {
    return prisma.$transaction(async (tx) => {
      const created = await tx.crmCustomer.create({
        data: {
          leadId: lead.id,
          brandId: resolvedBrandId,
          personId: lead.personId ?? null,
          companyId: lead.companyId ?? null,
          firstOrderId: order?.id ?? null,
          firstRevenueRecordId: revenueRecord?.id ?? null,
        },
        select: crmCustomerSelect,
      });
      const updated = await tx.lead.update({
        where: { id: lead.id },
        data: {
          status: "customer",
          ownerId: input.ownerId ?? lead.ownerId ?? null,
          brandId: resolvedBrandId ?? lead.brandId ?? null,
        },
        select: leadSelect,
      });
      return { customer: created, updatedLead: updated };
    });
  },
  async ensurePerson(input, brandId) {
    if (!input.email && !input.name && !input.phone) {
      throw new Error("Lead requires at least a name or email");
    }
    if (input.email) {
      const existing = await prisma.person.findUnique({ where: { email: input.email }, select: { id: true } });
      if (existing) return existing.id;
    }
    const [firstName, ...rest] = (input.name ?? "").split(" ");
    const lastName = rest.join(" ") || undefined;
    const person = await prisma.person.create({
      data: {
        brandId: input.brandId ?? brandId ?? null,
        firstName: firstName || null,
        lastName: lastName ?? null,
        email: input.email ?? null,
        phone: input.phone ?? null,
      },
    });
    return person.id;
  },
  async logCrmInsight({ leadId, brandId, payload }) {
    await prisma.aIInsight.create({
      data: {
        brandId: brandId ?? null,
        os: "crm",
        entityType: "lead-score",
        entityId: leadId,
        summary: `Lead score ${payload.score}`,
        details: JSON.stringify({
          payload,
          confidence: payload.probability,
          risk: payload.nextAction,
        }),
      },
    });
  },
  async createSegment({ data, select }) {
    return prisma.cRMSegment.create({ data, select });
  },
  async listSegments({ where, skip, take, select }) {
    const [total, rows] = await prisma.$transaction([
      prisma.cRMSegment.count({ where }),
      prisma.cRMSegment.findMany({ where, select, orderBy: { createdAt: "desc" }, skip, take }),
    ]);
    return { total, rows };
  },
  async findSegmentById(id, select) {
    return prisma.cRMSegment.findUnique({ where: { id }, select });
  },
  async findSegmentsByIds(where, select) {
    return prisma.cRMSegment.findMany({ where, select });
  },
  async resolveSegmentLeads({ where, take, select }) {
    const [total, rows] = await prisma.$transaction([
      prisma.lead.count({ where }),
      prisma.lead.findMany({ where, select, orderBy: { createdAt: "desc" }, take }),
    ]);
    return { total, rows };
  },
};
