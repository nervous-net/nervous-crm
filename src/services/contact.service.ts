import { prisma } from '../db/client.js';
import type { Prisma } from '@prisma/client';
import type { CreateContactInput, UpdateContactInput, ContactQuery } from '../shared/schemas/index.js';
import { validateTeamMember, validateTeamCompany } from '../lib/validation.js';

export class ContactService {
  async list(teamId: string, query: ContactQuery) {
    const { search, companyId, ownerId, limit, cursor, sort, include } = query;

    const where: Prisma.ContactWhereInput = {
      teamId,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(companyId && { companyId }),
      ...(ownerId && { ownerId }),
    };

    const orderBy = this.parseSort(sort);
    const includes = this.parseIncludes(include);

    const contacts = await prisma.contact.findMany({
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

    const hasMore = contacts.length > limit;
    const data = hasMore ? contacts.slice(0, -1) : contacts;
    const nextCursor = hasMore ? data[data.length - 1]?.id : null;

    const total = await prisma.contact.count({ where });

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

  async getById(teamId: string, id: string, include?: string) {
    const includes = this.parseIncludes(include);

    return prisma.contact.findFirst({
      where: { id, teamId },
      include: {
        ...includes,
        owner: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { deals: true, activities: true },
        },
      },
    });
  }

  async create(teamId: string, userId: string, input: CreateContactInput) {
    // Validate ownerId belongs to team if specified
    if (input.ownerId && input.ownerId !== userId) {
      await validateTeamMember(teamId, input.ownerId);
    }

    // Validate companyId belongs to team if specified
    if (input.companyId) {
      await validateTeamCompany(teamId, input.companyId);
    }

    return prisma.contact.create({
      data: {
        name: input.name,
        email: input.email,
        phone: input.phone,
        title: input.title,
        companyId: input.companyId,
        ownerId: input.ownerId || userId,
        teamId,
      },
      include: {
        company: true,
        owner: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async update(teamId: string, id: string, input: UpdateContactInput) {
    const contact = await prisma.contact.findFirst({
      where: { id, teamId },
    });

    if (!contact) {
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

    return prisma.contact.update({
      where: { id },
      data: input,
      include: {
        company: true,
        owner: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async delete(teamId: string, id: string) {
    const contact = await prisma.contact.findFirst({
      where: { id, teamId },
    });

    if (!contact) {
      return false;
    }

    await prisma.contact.delete({ where: { id } });
    return true;
  }

  private parseSort(sort: string): Prisma.ContactOrderByWithRelationInput {
    const desc = sort.startsWith('-');
    const field = desc ? sort.slice(1) : sort;

    const validFields = ['name', 'email', 'createdAt', 'updatedAt'];
    const orderField = validFields.includes(field) ? field : 'createdAt';

    return { [orderField]: desc ? 'desc' : 'asc' };
  }

  private parseIncludes(include?: string): Record<string, boolean> {
    if (!include) return {};

    const includes: Record<string, boolean> = {};
    const valid = ['company', 'activities', 'deals'];

    include.split(',').forEach((inc) => {
      const trimmed = inc.trim();
      if (valid.includes(trimmed)) {
        includes[trimmed] = true;
      }
    });

    return includes;
  }
}

export const contactService = new ContactService();
