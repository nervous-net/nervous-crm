import { prisma } from '../db/client.js';
import type { Prisma, DealStage } from '@prisma/client';
import type { CreateDealInput, UpdateDealInput, DealQuery } from '../shared/schemas/index.js';
import { validateTeamMember, validateTeamCompany, validateTeamContact } from '../lib/validation.js';

export class DealService {
  async list(teamId: string, query: DealQuery) {
    const { search, stage, companyId, contactId, ownerId, limit, cursor, sort, include } = query;

    const where: Prisma.DealWhereInput = {
      teamId,
      ...(search && {
        title: { contains: search, mode: 'insensitive' },
      }),
      ...(stage && { stage: stage as DealStage }),
      ...(companyId && { companyId }),
      ...(contactId && { contactId }),
      ...(ownerId && { ownerId }),
    };

    const orderBy = this.parseSort(sort);
    const includes = this.parseIncludes(include);

    const deals = await prisma.deal.findMany({
      where,
      orderBy,
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      include: {
        ...includes,
        owner: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    const hasMore = deals.length > limit;
    const data = hasMore ? deals.slice(0, -1) : deals;
    const nextCursor = hasMore ? data[data.length - 1]?.id : null;

    const total = await prisma.deal.count({ where });

    return {
      data,
      pagination: {
        total,
        limit,
        cursor: nextCursor,
        hasMore,
      },
    };
  }

  async getByStage(teamId: string) {
    const stages: DealStage[] = ['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];

    // Single query for all deals instead of 6 separate queries
    const allDeals = await prisma.deal.findMany({
      where: { teamId },
      orderBy: { updatedAt: 'desc' },
      include: {
        company: { select: { id: true, name: true } },
        contact: { select: { id: true, name: true } },
        owner: { select: { id: true, name: true } },
      },
    });

    // Group deals by stage in memory
    const dealsByStage = new Map<DealStage, typeof allDeals>();
    for (const stage of stages) {
      dealsByStage.set(stage, []);
    }
    for (const deal of allDeals) {
      dealsByStage.get(deal.stage)?.push(deal);
    }

    // Build pipeline response
    const pipeline = stages.map((stage) => {
      const deals = dealsByStage.get(stage) || [];
      const totalValue = deals.reduce(
        (sum, deal) => sum + (deal.value?.toNumber() || 0),
        0
      );

      return {
        stage,
        deals,
        count: deals.length,
        totalValue,
      };
    });

    return pipeline;
  }

  async getById(teamId: string, id: string, include?: string) {
    const includes = this.parseIncludes(include);

    return prisma.deal.findFirst({
      where: { id, teamId },
      include: {
        ...includes,
        owner: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { activities: true },
        },
      },
    });
  }

  async create(teamId: string, userId: string, input: CreateDealInput) {
    // Validate ownerId belongs to team if specified
    if (input.ownerId && input.ownerId !== userId) {
      await validateTeamMember(teamId, input.ownerId);
    }

    // Validate companyId belongs to team if specified
    if (input.companyId) {
      await validateTeamCompany(teamId, input.companyId);
    }

    // Validate contactId belongs to team if specified
    if (input.contactId) {
      await validateTeamContact(teamId, input.contactId);
    }

    return prisma.deal.create({
      data: {
        title: input.title,
        value: input.value,
        stage: input.stage as DealStage,
        probability: input.probability,
        companyId: input.companyId,
        contactId: input.contactId,
        ownerId: input.ownerId || userId,
        teamId,
      },
      include: {
        company: true,
        contact: true,
        owner: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async update(teamId: string, id: string, input: UpdateDealInput) {
    const deal = await prisma.deal.findFirst({
      where: { id, teamId },
    });

    if (!deal) {
      return null;
    }

    // Validate ownerId belongs to team if being changed
    if (input.ownerId) {
      await validateTeamMember(teamId, input.ownerId);
    }

    // Validate companyId belongs to team if being changed
    if (input.companyId) {
      await validateTeamCompany(teamId, input.companyId);
    }

    // Validate contactId belongs to team if being changed
    if (input.contactId) {
      await validateTeamContact(teamId, input.contactId);
    }

    // If stage is changing to won or lost, set closedAt
    const closedAt =
      input.stage === 'won' || input.stage === 'lost'
        ? new Date()
        : input.stage && !['won', 'lost'].includes(input.stage)
        ? null
        : undefined;

    return prisma.deal.update({
      where: { id },
      data: {
        ...input,
        stage: input.stage as DealStage | undefined,
        ...(closedAt !== undefined && { closedAt }),
      },
      include: {
        company: true,
        contact: true,
        owner: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async delete(teamId: string, id: string) {
    const deal = await prisma.deal.findFirst({
      where: { id, teamId },
    });

    if (!deal) {
      return false;
    }

    await prisma.deal.delete({ where: { id } });
    return true;
  }

  private parseSort(sort: string): Prisma.DealOrderByWithRelationInput {
    const desc = sort.startsWith('-');
    const field = desc ? sort.slice(1) : sort;

    const validFields = ['title', 'value', 'stage', 'createdAt', 'updatedAt'];
    const orderField = validFields.includes(field) ? field : 'createdAt';

    return { [orderField]: desc ? 'desc' : 'asc' };
  }

  private parseIncludes(include?: string): Record<string, boolean> {
    if (!include) return {};

    const includes: Record<string, boolean> = {};
    const valid = ['company', 'contact', 'activities'];

    include.split(',').forEach((inc) => {
      const trimmed = inc.trim();
      if (valid.includes(trimmed)) {
        includes[trimmed] = true;
      }
    });

    return includes;
  }
}

export const dealService = new DealService();
